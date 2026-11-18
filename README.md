<!-- esasim: cover -->
![Virtual wind tunnel](assets/cover.jpg)
<!-- /esasim: cover -->

<div align="center">

<!-- Banner: upload a picture named banner.png under Data › Readme pictures (a car with the smoke rake in front works well), then: ![Virtual wind tunnel](pictures/banner.png) -->

# Virtual wind tunnel

**Upload your car models and study their aerodynamics in a wind tunnel computed on your own GPU: drag, lift, surface pressure, and smoke you move through the flow in real time.**

Every car in the **Car models** dataset is placed on the floor of a virtual tunnel and simulated in turn with lattice-Boltzmann CFD written in NVIDIA Warp. Then the View puts it in a wind gallery: the car with its own materials on an asphalt belt, a smoke wand you drag in front of it, flow slices you slide through the air, and a table that ranks every car by drag.

![type](https://img.shields.io/badge/type-Automotive-blue) ![language](https://img.shields.io/badge/language-Python-3776AB) ![runs on](https://img.shields.io/badge/runs%20on-NVIDIA%20%7C%20CPU-6f42c1) ![method](https://img.shields.io/badge/method-Lattice%20Boltzmann%20LES-orange) ![input](https://img.shields.io/badge/input-GLB%20%7C%20glTF%20%7C%20STL%20%7C%20OBJ-178c8c) [![made with](https://img.shields.io/badge/made%20with-EsaSim-0b7285)](https://esacode.com/)

</div>

## Overview

A wind tunnel blows air at a fixed car and measures what the air does to it: the drag that costs fuel or battery, the lift or downforce that changes grip, and where the flow separates and leaves a turbulent wake. Smoke streams make the flow visible; pressure taps show where the surface is pushed and pulled.

This project does the same in a computer, in the spirit of NVIDIA's *Digital Twins for Fluid Simulation* blueprint. The air around the car is a lattice of millions of cells; at each time step every cell exchanges particles with its 18 neighbours (the lattice Boltzmann method), and the small eddies too fine for the grid are modelled (LES, large-eddy simulation). The run averages the flow over the last part of the simulation and keeps it, so the View can send smoke anywhere through it afterwards, at any speed, without simulating again.

Nobody has to prepare the models. Each file is turned to face the wind, scaled to metres and turned into a solid on the grid by itself; the original model, with its materials, is kept for the View.

## Flows

### 1 · Wind tunnel

[**Open the blueprint →**](https://esacode.com/app/projects/22/flows/79)

| Block | What it does |
|---|---|
| **Car models** | The dataset of cars to test: GLB/glTF, STL, OBJ, PLY or OFF, one car per file. |
| **Wind tunnel (GPU CFD)** | Orients and scales each car, builds the grid, runs the flow on the GPU and writes the forces, the mean flow field, the pressure on the surface and the report. |
| **Live flow** | Sends the tunnel's progress to the View while it runs: the car being simulated, its drag so far, the speed of the solver and a live slice of the flow. |
| **Wind tunnel** | The 3D wind gallery (below). |
| **Results**, **Drag by model**, **Report** | The table of forces, a bar chart of Cd and CdA by car, and the run's Markdown report. |

## The View

- **Car**: **Original** shows the model with its own materials (GLB/glTF); **Pressure** paints the surface pressure coefficient Cp on the same geometry (red where the air pushes, blue where it pulls); **Paint** shows it in a neutral finish.
- **Smoke wand**: a rake of nozzles in front of the car. Drag its yellow handle in the 3D view, or use the sliders: number of jets, vertical or horizontal rake or a single point, height, side, spacing, distance ahead, density and colour (yellow, white or by air speed). The smoke follows the computed mean flow, interpolated wherever the wand is, and spreads where the run measured turbulence.
- **Slow motion**: the smoke moves at the **Wind** speed divided by the slow-motion factor; ×1 is real time.
- **Slice**: a side, top or cross-section plane of air speed, pressure or turbulence, sampled from the flow as you move it with its slider.
- **Streamlines** from the run, and the **Wind** slider, which gives the drag force and the power it takes at that speed (same Cd).
- **Compare models**: every car ranked by CdA (drag area), with Cd, Cl, drag and power; click one to show it. Beside it, the drag coefficient over the run, with the averaged part shaded.
- **Run tunnel** starts a new run with the chosen resolution and wind speed, and the **Live tunnel** panel follows it.
- The gallery: a dark asphalt belt just larger than the car, set into a polished floor that mirrors the car and the walls.

## What is computed

| Part | How |
|---|---|
| **Solver** | lattice Boltzmann D3Q19, regularized collision, Smagorinsky LES (Cs 0.17), written in NVIDIA Warp |
| **Tunnel** | velocity inlet, pressure outlet with a sponge zone, slip floor (as on a rolling road), periodic sides; the wind ramps up from rest |
| **Car surface** | halfway bounce-back with a partial-slip wall model, since the boundary layer is thinner than a cell; wheels stand still |
| **Grid** | *Resolution* cells per car length: 64 quick, 96 standard, 128 fine, 160 very fine |
| **Forces** | momentum exchange on the surface, averaged over the second half of the run: drag, lift and side force, as Cd, Cl and CdA on the frontal area |
| **Flow field** | the mean velocity, pressure and turbulence intensity around the car, kept on a coarser grid for the View |

At 128 cells per length a car takes 14 to 27 million cells and 3 to 5 minutes on an RTX 3070 (about 900 million cell updates a second).

## Where it runs

- **NVIDIA GPU**: the way to run it.
- **CPU**: Warp falls back to the CPU; use **64 (quick)** there, it is much slower.
- The View runs in the browser; smoke and slices are computed there from the run's files, so moving them needs no new run.

## What you need

- A machine with the EsaSim worker (Project › Compute), with an NVIDIA GPU.
- Python packages, installed by the worker the first time: `warp-lang`, `numpy`, `scipy`, `scikit-image`, `trimesh` and `fast-simplification`. No account or key is needed.
- Your car models in the **Car models** dataset.

## How to run it

1. **Upload your cars**: under **Data**, open **Car models** and add the files, one car per file.
2. Under **Compute**, check that a machine with an NVIDIA GPU is available for this project.
3. Run [**1 · Wind tunnel**](https://esacode.com/app/projects/22/flows/79), or press **Run tunnel** in the View. The cars are simulated one after the other.
4. Switch to **View**, maximize the **Wind tunnel** panel, pick a model and move the smoke wand.

## Settings worth knowing

On the **Wind tunnel (GPU CFD)** block:

- **Resolution** (128 fine) and **Speed** (120 km/h). The speed sets the Reynolds number; the View's Wind slider only rescales the forces.
- **Flow time** (8): how many times the air crosses the car length; the second half is averaged.
- **Real lengths**: one line per car, part of its file name = its real length in metres (for example `x7 = 5.15`). Models on Sketchfab are often drawn at the wrong size.
- **Length axis**, **Up axis**, **Nose at**, **Units** (auto): the orientation is found by itself (the longest side is the length, glTF is Y-up, the taller end is the rear, sizes in mm or cm become metres); set them if a car comes out the wrong way round.
- **Reynolds cap**, **Smagorinsky**, **Wall slip**, **Max triangles**: solver details; the defaults suit cars.

## What you get

- **results.csv**: per car, Cd, Cl, side force, CdA, frontal area, and drag, lift and power at the chosen speed.
- **convergence.csv**: the forces through the run.
- `<car>_cp.ply`: the surface coloured by pressure.
- For the View: `<car>.tunnel.json.gz` (surface, streamlines, forces, placement), `<car>.field.bin.gz` (the mean flow) and `<car>.source.glb` (the original model).
- **report.md**: the run in a page.

From one run at 128 cells per length and 120 km/h: BMW X7 Cd 0.43 (CdA 1.37 m²), Mercedes W17 Cd 0.70, Ferrari SF-26 Cd 0.78.

## Data and licences

The car models come from [Sketchfab](https://sketchfab.com) and belong to their authors:

- **2019 BMW X7 xDrive40i**: [Ddiaz Design](https://sketchfab.com/ddiaz-design)
- **2020 Lamborghini Aventador SVJ 63 Roadster**: [Ddiaz Design](https://sketchfab.com/ddiaz-design)
- **2021 Lamborghini Countach LPI 800-4**: [VTX](https://sketchfab.com/VTX_car)
- **1985 DeLorean DMC-12 Time Machine**: [VTX](https://sketchfab.com/VTX_car)
- **2026 Ferrari SF-26**: [Dave Love SketchFab](https://sketchfab.com/Tyler_Dave)

Respect each model's licence on Sketchfab when sharing results. NVIDIA Warp is Apache 2.0. The code of the blocks is EsaSim's.

## Notes

- This is a fast, coarse-grid digital twin for comparing designs, not certification CFD. Absolute Cd depends on the resolution: compare cars with each other at the same settings. On a validation case, the Ahmed body, the solver gives Cd 0.36 at 64 cells per length against about 0.29 measured.
- Race-car wings and floors are thinner than the cells, so their downforce is underestimated.
- The wheels do not turn, in the simulation or in the View: without rigged wheels a model's hubs and brakes cannot be told apart from its rims.
- The smoke shows the time-averaged flow with the measured turbulence added as random motion; it is not a replay of the unsteady wake.
- The first run on a machine installs the packages and compiles the Warp kernels, a few minutes more.

<!-- esasim: files of the project -->

---

An [EsaSim](https://esacode.com/) project of the workspace Gianluca De Novi's workspace (automotive).

### Blueprints in this repository

- [1 · Wind tunnel](blueprints/1-wind-tunnel.json) · 7 blocks · version 7

### Workspace blocks it uses

- [Wind tunnel (GPU CFD)](blocks/ws-wind-tunnel-gpu-cfd) · version 6
- [Wind tunnel view](blocks/ws-wind-tunnel-view) · version 7

The data the blueprints read (Car models) stays in EsaSim.

Keys pasted in blocks (secret settings) are not saved here, nor are the team and the results of runs.
