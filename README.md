# Implementing PTB CLI via TypeScript

### Interface for Programmable Transaction Blocks on IOTA Blockchain

> **Author:** Giovanni Maria Savoca  
> **Professor:** Prof. Stefano Ferretti  
> **Tutor:** Arianna Arruzzoli  
> **Academic Year:** 2025/2026 — University of Bologna  
> **Date:** February 2026

---

## Table of Contents

1. [Introduction](#introduction)
2. [Project Objectives](#project-objectives)
3. [System Architecture](#system-architecture)
   - [Technologies Used](#technologies-used)
   - [IOTA SDK Components](#iota-sdk-components)
   - [User Interface Structure](#user-interface-structure)
   - [Available Move Functions](#available-move-functions)
   - [Transaction Construction and Execution](#transaction-construction-and-execution)
   - [Modular Architecture](#modular-architecture)
4. [Results](#results)
5. [Conclusions](#conclusions)
6. [References](#references)

---

## Introduction

Over the past decade, blockchain technology has grown significantly across a wide range of use cases — from finance and gaming to healthcare and public administration. Applications leveraging decentralized technologies are commonly called **decentralized applications (dApps)**.

To allow interaction with the blockchain, IOTA has implemented **Programmable Transaction Blocks (PTB)**, a tool that uses the Move language to interact with smart contracts.

This project implements an SDK in TypeScript to work with smart contracts already deployed on the **IOTA Testnet**, providing a clean and simple web interface for the user to manage and transmit data to on-chain logic.

---

## Project Objectives

The project is structured into **four milestones** that served as evaluation criteria:

| Milestone               | Description                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Milestone 1**         | Basic interface to interact with the `utils` package: form for data entry, action buttons, and a colored status banner.                         |
| **Milestone 2**         | Implementation of Move simple and complex object types: recursive management of numeric types (`u8` to `u256`), strings, and object references. |
| **Milestone 3**         | Expansion of input format to include mutable/immutable objects, vectors, and `VecMap` structures.                                               |
| **Milestone 4 (Bonus)** | Advanced integration with the `manage_documents` package, supporting collaborative document creation with multi-author permission management.   |

---

## System Architecture

### Technologies Used

| Technology                       | Role                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------- |
| **IOTA Blockchain (Testnet)**    | Foundational layer for executing Move smart contracts                           |
| **Move Language**                | Resource-oriented language for on-chain logic                                   |
| **TypeScript**                   | SDK and UI development, providing type safety for blockchain interactions       |
| **@iota/iota-sdk**               | Official integration layer for building PTBs and communicating with the network |
| **IOTA Explorer (Testnet Scan)** | Monitor transactions and verify transaction digests                             |
| **Vite**                         | Development environment and production bundling                                 |

---

### IOTA SDK Components

#### `IotaClient`

Manages the JSON-RPC connection to an IOTA full node. Instantiated once at startup via `getFullnodeUrl("testnet")`. Exposes two key methods:

- `devInspectTransactionBlock` — read-only simulation (no state change, no gas)
- `executeTransactionBlock` — state-modifying execution

#### `Transaction` (PTB Builder)

Core builder for Programmable Transaction Blocks. A PTB is a sequence of composable **commands** executed atomically — either all succeed or the entire block is rolled back.

The primary command used is `moveCall`, targeting a Move function as `package::module::function`.

Two categories of inputs:

- **Pure inputs** (`tx.pure.*`): literal values not existing on-chain (primitives, vectors, addresses)
- **Object inputs** (`tx.object()`): reference on-chain objects by Object ID

#### `Ed25519Keypair`

Manages the cryptographic identity of the user. The private key is loaded from the `.env` file (`VITE_PRIVATE_KEY_HEX`) and used for:

- **Address derivation** via `getPublicKey().toIotaAddress()`
- **Transaction signing** via `signTransaction()` when submitting real transactions

---

### User Interface Structure

The web interface uses a **two-column layout** with tab-based navigation:

#### Left Column — Tabs and Function Cards

**Tab "Utils Functions"**
A scrollable list of function cards, one per Move function in the `utils` package. Each card includes:

- Function name and Move signature
- Typed input fields (text, number, or comma-separated for vectors)
- `SIMULATE` button — cost-free, read-only test via `devInspect`
- `EXECUTE` button — active only after a successful simulation; submits the real signed transaction

**Tab "Create Document"**
A complex form to create an on-chain document, including:

- Title, author address (with a `Fill` button for the wallet address), content, category, and version
- Dynamic **Additional Editors** section to add collaborator addresses

#### Right Column — Results and Transaction Details

- **Results panel:** Displays the last invoked function name, its decoded return value, and — for real executions — a clickable link to the IOTA Explorer. Includes a `Copy` button.
- **Transaction Details panel:** Shows the full JSON response from the IOTA node (effects, inputs, object changes, events, gas consumption), with a real-time search bar and match highlighting.

#### Status Banner

A full-width notification banner with color coding:

- 🟢 **Green** — successful operation
- 🔴 **Red** — error
- 🔵 **Blue** — informational message

---

### Available Move Functions

#### Module `myutils` — String Utilities

| Function              | Description                                      | Input                | Output           |
| --------------------- | ------------------------------------------------ | -------------------- | ---------------- |
| `split`               | Splits a string by a separator (ASCII code)      | `String`, `u8`       | `vector<String>` |
| `check_lowercase`     | Checks if all characters are lowercase ASCII     | `String`             | `bool`           |
| `check_is_hex`        | Checks if a string is a valid hex sequence       | `String`             | `bool`           |
| `remove_white_spaces` | Removes all whitespace from a string             | `&String`            | `String`         |
| `equals`              | Compares two strings (whitespace-insensitive)    | `&String`, `&String` | `bool`           |
| `count_digits`        | Counts decimal digits in a `u64` integer         | `u64`                | `u64`            |
| `sum_bytes_u8`        | Sums byte vector elements with saturation at 255 | `&vector<u8>`        | `u8`             |
| `sum_bytes_u32`       | Sums byte vector elements with overflow abort    | `&vector<u8>`        | `u32`            |
| `string_to_u64`       | Converts a numeric string to `u64`               | `&String`            | `Option<u64>`    |
| `boolean_from_str`    | Converts `"true"`/`"false"` string to `bool`     | `&String`            | `Option<bool>`   |

#### Module `date_time`

| Function       | Description                                  | Input | Output   |
| -------------- | -------------------------------------------- | ----- | -------- |
| `ms_to_string` | Converts Unix timestamp (ms) to `YYYY-MM-DD` | `u64` | `String` |

#### Module `manage_documents`

| Function          | Description                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `create_document` | Creates a persistent shared document object on-chain with title, authors, content, category, version, Clock, visibility, and metadata |

---

### Transaction Construction and Execution

#### Simulation Mode (`devInspect`)

1. A new `Transaction` object is created.
2. A `moveCall` is added with validated inputs from the DOM.
3. The transaction is serialized with `onlyTransactionKind: true` (no signature required).
4. The IOTA node executes it in a sandboxed environment — **no state change, no gas cost**.
5. The node returns `effects`, `status`, and `returnValues` (BCS-encoded).
6. Return values are decoded and displayed in the Results panel.

> Ideal for pure functions — allows unlimited, cost-free testing.

#### Real Execution Mode (`executeTransactionBlock`)

1. The transaction is built without `onlyTransactionKind`, producing a complete payload.
2. Transaction bytes are signed using the `Ed25519Keypair` from `.env`.
3. The signed transaction is submitted to the node via `executeTransactionBlock`.
4. The node validates the signature, checks gas, executes, and commits state changes.
5. The application receives the **Transaction Digest**, object changes, events, and gas used.
6. The Results panel displays the digest with a direct link to IOTA Explorer.

> ⚠️ A confirmation dialog is shown before every real execution to warn about gas consumption.

---

### Modular Architecture

The codebase was refactored from a monolithic script to a **modular architecture**:

| Module             | Responsibility                                                |
| ------------------ | ------------------------------------------------------------- |
| `main.ts`          | Entry point: application initialization and event routing     |
| `tx-engine.ts`     | Abstracts SDK details — handles simulated and real executions |
| `ui-interface.ts`  | Manages DOM selectors, banners, and result display            |
| `utils-manager.ts` | Registry of function builders for the `utils` package         |
| `doc-manager.ts`   | Logic for document creation and multi-editor management       |

#### Logical Flow (Verification-before-Execution)

```
1. Input Capture   →  ui-interface.ts  reads form values
2. Validation      →  utils-manager.ts checks types and address formats
3. PTB Construction →  Transaction block built via moveCall
4. Simulation      →  DevInspect verifies correctness (no gas cost)
5. Execution       →  Real transaction signed, submitted, digest displayed
```

#### Key Design Decisions

- **TypeScript** — Essential for handling Move types correctly (`BigInt` for `u256`, strong typing for PTB arguments).
- **Modular structure** — Enables clean management of complex features like vectors and `VecMap`.
- **Mandatory simulation** — Protects users from failed transactions before hitting the live Testnet.
- **Registry pattern** — Central registry in `utils-manager.ts` makes it easy to expand function support.

---

## Results

All milestones were successfully completed and verified via the IOTA Explorer:

- ✅ **Milestone 1** — Functional interface with forms, buttons, and status banners.
- ✅ **Milestone 2** — Support for all numeric types (`u8`–`u256`), strings, and object references.
- ✅ **Milestone 3** — Successful integration of mutable/immutable objects, vectors, and `VecMap` structures.
- ✅ **Milestone 4 (Bonus)** — Multi-author document management system deployed and verified on Testnet.

Transactions were verified through the IOTA Explorer, confirming the correct execution of PTBs and storage of data on the Testnet.

---

## Conclusions

This project demonstrated how **PTBs and TypeScript** can be combined to create powerful tools for blockchain interaction. The transition to a modular architecture was a key factor in managing the increasing complexity of the milestones.

The final result is a **robust SDK and web interface** that allows safe, clear, and simple user interaction with Move smart contracts on the IOTA network — meeting all academic criteria and providing a solid foundation for future dApp development.

---

## References

- [IOTA Documentation](https://docs.iota.org/)
- [IOTA Explorer (Testnet)](https://iotascan.com/testnet/home)
- [VecMap Reference](https://docs.iota.org/developer/references/framework/iota/vec_map)
- [Move Language](https://move-language.github.io/move/)
