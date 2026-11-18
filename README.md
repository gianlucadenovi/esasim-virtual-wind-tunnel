<!-- esasim: cover -->
![Virtual wind tunnel](assets/cover.svg)
<!-- /esasim: cover -->

# Virtual wind tunnel

An interactive wind tunnel for car models, in the spirit of NVIDIA's *Digital Twins for Fluid Simulation* blueprint, run on your own GPU workers.

## How to use it

1. **Upload your cars**: in *Data*, open the dataset **Car models** and add STL, OBJ, GLB/glTF, PLY or OFF files (one car per file). Units are detected (m, cm, mm); by default the car's length runs along X with the nose at the smallest X and Z up. If your files use Y up or another axis, change *Length axis*, *Up axis* and *Nose at* on the Wind tunnel block.
2. **Run** the flow *1 · Wind tunnel* (or press **Run tunnel** in the View). Each car is placed on the road of a virtual tunnel and simulated in turn. With no uploads, four sample cars are used (fastback, SUV, pickup, sports car); pick others with *Sample cars* (`fastback, notchback, estate, suv, pickup, van, sports, ahmed25`, `all` or `none`).
3. **Study** the results in the View: pick a model, show surface pressure (Cp) or paint, streamlines and moving particles, centre or horizontal flow slices (speed or pressure), and move the wind-speed slider to see drag force and power. The side panel ranks all models by CdA and shows the drag history of each run. While a run is going, the centre-plane flow forms live.

## What it computes

- **Solver**: lattice Boltzmann method (D3Q19) with a regularized collision and a Smagorinsky LES model, written in NVIDIA Warp and run on the worker's GPU (CPU fallback). Velocity inlet, pressure outlet with a sponge zone, slip floor (like a rolling road), periodic side walls, static wheels.
- **Grid**: *Resolution* cells per car length (64 quick, 96 standard, 128 fine, 160 very fine). At 96 a typical car is 5 to 8 million cells; one car takes about a minute on an RTX 3070 or V100.
- **Outputs**: `results.csv` (Cd, Cl, side force, CdA, drag, lift and drag power at the chosen speed), `convergence.csv`, per-car `*_cp.ply` surfaces coloured by pressure (with a `cp` property), the View's `*.tunnel.json.gz` files, and a Markdown report.

## Accuracy

This is a fast, coarse-grid digital twin for comparing designs, not a certification CFD. Absolute Cd values depend on resolution; compare cars with each other at the same settings, and use *fine* grids for closer numbers. The Ahmed body (`ahmed25`, experimental Cd about 0.29) is included as a reference case.

<!-- esasim: files of the project -->

---

An [EsaSim](https://esacode.com/) project of the workspace Gianluca De Novi's workspace (automotive).

### Blueprints in this repository

- [1 · Wind tunnel](blueprints/1-wind-tunnel.json) · 3 blocks · version 1

### Workspace blocks it uses

- [Wind tunnel (GPU CFD)](blocks/ws-wind-tunnel-gpu-cfd) · version 1

Keys pasted in blocks (secret settings) are not saved here. Datasets, results and the team stay in EsaSim.
