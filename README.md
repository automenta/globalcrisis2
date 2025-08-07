# ThreatForge

## Overview

ThreatForge is a cutting-edge, comprehensive, and modular game engine designed to simulate modern global threats. It offers an educational yet entertaining strategy and simulation experience, allowing users to explore the complex dynamics of various dangers facing our world. The engine supports detailed simulation across a wide array of threat domains, including:

- **Cyber**: Digital attacks, data breaches, and network vulnerabilities.
- **Biological**: Pandemics, bioweapons, and health crises.
- **Environmental**: Climate change impacts, natural disasters, and ecological collapse.
- **Quantum**: Quantum computing threats, encryption breaches, and new forms of digital warfare.
- **Radiological**: Nuclear accidents, dirty bombs, and radiation exposure.
- **Robotic**: Autonomous weapon systems, AI uprisings, and robotic labor displacement.

## Core Components

The ThreatForge engine is built upon a robust set of core components that enable its advanced simulation capabilities and modular design:

- **Modular Architecture**: Features a highly flexible, plugin-based design for integrating diverse threat domains. This allows for easy expansion and customization, enabling developers and modders to introduce new threats and mechanics seamlessly.
- **Faction System**: Implements an asymmetric faction system where each playable entity possesses unique roles, capabilities, and objectives. This design promotes varied gameplay experiences and encourages strategic diversity.
- **Threat Generation**: Incorporates sophisticated algorithms for generating various threat types, including `REAL` (active and genuine), `FAKE` (designed for psychological impact or misdirection), and `UNKNOWN` (requiring investigation to determine their true nature).
- **Narrative Engine**: An AI-driven system that dynamically generates event chains and chronicles, creating emergent storylines that respond to in-game actions and simulation outcomes. This ensures a unique and evolving narrative for each playthrough.
- **Physics Simulation**: Utilizes advanced physics models to simulate realistic propagation patterns and interactions across all threat domains. This includes factors like spread rates, environmental influences, and cross-domain impacts, ensuring a high degree of realism in threat behavior.

## Getting Started

ThreatForge is designed for easy accessibility and deployment across various platforms. Follow these steps to get started with the simulation:

1.  **Install as a Progressive Web App (PWA)**: The most straightforward way to access ThreatForge is by installing it directly from your web browser as a Progressive Web App. This provides a native-like experience without requiring app store downloads.
2.  **Run Offline with Service Workers**: Once installed as a PWA, ThreatForge can run entirely offline. Service Workers cache all necessary assets, ensuring continuous gameplay even without an internet connection.
3.  **Supports Touch/Mouse Inputs**: The engine is optimized for both mobile and desktop environments, supporting intuitive touch inputs for tablets and smartphones, as well as traditional mouse and keyboard controls for desktop users.

## Development

ThreatForge is an actively developed project with a clear roadmap and robust testing procedures to ensure stability, performance, and expandability.

- **Roadmap**: The initial `v1.0` release focuses on establishing core threat domains (cyber, biological, environmental, quantum, radiological, and robotic). Future expansions and new content will primarily be introduced via community-driven modifications and official add-ons.
- **Testing**: Comprehensive automated testing is in place to validate cross-domain interactions, ensuring that complex threat scenarios behave as expected. This includes rigorous testing for emergent behaviors, game balance, and physics accuracy.

### Headless Testing

This project uses Playwright to run headless tests. To run the tests, you need to have Node.js and npm installed.

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run tests:**
    ```bash
    npm test
    ```

- **Deployment**: The primary deployment method is as a browser-installable Progressive Web App (PWA). For desktop users who prefer a standalone application, an optional Electron wrapper is provided, bundling the PWA into a native executable.
