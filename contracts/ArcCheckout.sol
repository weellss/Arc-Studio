// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ArcCheckout
/// @notice Permissionless USDC invoices and tips paid directly to merchants.
/// @dev Payers must first approve this contract to spend USDC. Amounts are raw
/// token units (6 decimals for Arc USDC at 0x3600000000000000000000000000000000000000).
/// No owner, fees, escrow, or withdrawal functionality is provided.
contract ArcCheckout is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The lifecycle states of an invoice.
    enum Status {
        Open,
        Paid,
        Cancelled
    }

    /// @notice Invoice details; paidBy and paidAt remain zero until payment.
    struct Invoice {
        address merchant;
        uint256 amount;
        string memo;
        uint256 createdAt;
        address paidBy;
        uint256 paidAt;
        Status status;
    }

    error ZeroAddress();
    error ZeroAmount();
    error MemoTooLong();
    error UnknownInvoice(uint256 id);
    error InvoiceNotOpen(uint256 id);
    error NotMerchant();
    error SelfPayment();

    /// @notice Emitted when a merchant creates an invoice.
    event InvoiceCreated(uint256 indexed id, address indexed merchant, uint256 amount, string memo);
    /// @notice Emitted after an invoice has been paid successfully.
    event InvoicePaid(uint256 indexed id, address indexed merchant, address indexed payer, uint256 amount);
    /// @notice Emitted when the merchant cancels an open invoice.
    event InvoiceCancelled(uint256 id);
    /// @notice Emitted after a successful direct tip.
    event Tipped(address indexed merchant, address indexed payer, uint256 amount, string memo);

    /// @notice The immutable ERC-20 used for all payments.
    IERC20 public immutable usdc;

    /// @notice Total number of invoices created, including paid and cancelled ones.
    uint256 public invoiceCount;

    /// @notice Total raw USDC units received through successful invoices and tips.
    mapping(address => uint256) public merchantReceived;

    mapping(uint256 => Invoice) private _invoices;
    mapping(address => uint256[]) private _merchantInvoiceIds;

    /// @param usdcAddress USDC ERC-20 address; must not be zero.
    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert ZeroAddress();
        usdc = IERC20(usdcAddress);
    }

    /// @notice Create an open invoice with the caller as merchant.
    /// @param amount Positive amount in raw USDC units.
    /// @param memo Invoice memo, limited to 140 bytes (not characters).
    /// @return id The new invoice ID; IDs start at 1.
    function createInvoice(uint256 amount, string calldata memo) external returns (uint256 id) {
        _validatePayment(amount, memo);
        id = ++invoiceCount;
        _invoices[id] = Invoice({
            merchant: msg.sender,
            amount: amount,
            memo: memo,
            createdAt: block.timestamp,
            paidBy: address(0),
            paidAt: 0,
            status: Status.Open
        });
        _merchantInvoiceIds[msg.sender].push(id);
        emit InvoiceCreated(id, msg.sender, amount, memo);
    }

    /// @notice Pay an open invoice in full directly to its merchant.
    /// @dev The merchant cannot pay their own invoice. State changes precede
    /// the token transfer and revert atomically if the transfer fails.
    /// @param id An existing open invoice ID.
    function pay(uint256 id) external nonReentrant {
        Invoice storage invoice = _getInvoice(id);
        if (invoice.status != Status.Open) revert InvoiceNotOpen(id);
        address merchant = invoice.merchant;
        if (msg.sender == merchant) revert SelfPayment();
        uint256 amount = invoice.amount;

        invoice.status = Status.Paid;
        invoice.paidBy = msg.sender;
        invoice.paidAt = block.timestamp;
        merchantReceived[merchant] += amount;

        usdc.safeTransferFrom(msg.sender, merchant, amount);
        emit InvoicePaid(id, merchant, msg.sender, amount);
    }

    /// @notice Cancel an open invoice; only its merchant may do so.
    /// @param id An existing open invoice ID.
    function cancelInvoice(uint256 id) external {
        Invoice storage invoice = _getInvoice(id);
        if (msg.sender != invoice.merchant) revert NotMerchant();
        if (invoice.status != Status.Open) revert InvoiceNotOpen(id);
        invoice.status = Status.Cancelled;
        emit InvoiceCancelled(id);
    }

    /// @notice Send a direct tip without creating an invoice.
    /// @param merchant Nonzero recipient address.
    /// @param amount Positive amount in raw USDC units.
    /// @param memo Payment memo, limited to 140 bytes (not characters).
    function tip(address merchant, uint256 amount, string calldata memo) external nonReentrant {
        if (merchant == address(0)) revert ZeroAddress();
        _validatePayment(amount, memo);
        merchantReceived[merchant] += amount;

        usdc.safeTransferFrom(msg.sender, merchant, amount);
        emit Tipped(merchant, msg.sender, amount, memo);
    }

    /// @notice Return the full invoice details; reverts for an unknown ID.
    /// @param id An existing invoice ID.
    /// @return invoice The stored invoice.
    function getInvoice(uint256 id) external view returns (Invoice memory invoice) {
        return _getInvoice(id);
    }

    /// @notice Return all invoice IDs created by a merchant, in creation order.
    /// @param merchant The merchant to query.
    /// @return ids All invoice IDs, regardless of status.
    function getMerchantInvoiceIds(address merchant) external view returns (uint256[] memory ids) {
        return _merchantInvoiceIds[merchant];
    }

    /// @dev Zero merchant is an existence sentinel since creators cannot be zero.
    function _getInvoice(uint256 id) private view returns (Invoice storage invoice) {
        invoice = _invoices[id];
        if (invoice.merchant == address(0)) revert UnknownInvoice(id);
    }

    /// @dev Shared amount and byte-length validation for invoices and tips.
    function _validatePayment(uint256 amount, string calldata memo) private pure {
        if (amount == 0) revert ZeroAmount();
        if (bytes(memo).length > 140) revert MemoTooLong();
    }
}
