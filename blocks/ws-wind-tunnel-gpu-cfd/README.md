# Wind tunnel (GPU CFD)

A virtual wind tunnel for car models: lattice-Boltzmann LES on the GPU (NVIDIA Warp) gives drag, lift, surface pressure, streamlines and flow slices for each STL/OBJ/GLB car.

Wire car models (STL, OBJ, GLB/glTF, PLY, OFF; one car per file) into Car models, for example from a Dataset block. Each car is scaled (units detected or set), turned so its length runs along the wind and its wheels stand on the road, voxelized and simulated in turn: D3Q19 lattice Boltzmann with a regularized collision and a Smagorinsky LES model, a partial-slip wall model on the body, slip floor (like a rolling road), velocity inlet, pressure outlet with a sponge. Forces come from momentum exchange, averaged over the last part of the run. With no files wired (or Sample cars set), built-in parametric cars are used: fastback, notchback, estate, suv, pickup, van, sports, and the ahmed25 reference body. Outputs: the View's files (*.tunnel.json.gz: the car's surface with pressure, streamlines, slices, history), results.csv (Cd, Cl, Cs, CdA, drag, lift, power at the speed), convergence.csv, surfaces coloured by Cp (PLY with a cp property), the sample cars as STL and a report. Live telemetry channel tunnel: model, time, running Cd and the centre-plane flow. Resolution is cells per car length: 96 is about 6 M cells and a minute per car on an RTX 3070 / V100.

An [EsaSim](https://esacode.com/) blueprint block: it runs on a worker, in Python (`backend.py`, `def run(ctx)`).

| | |
|---|---|
| Block | `ws-wind-tunnel-gpu-cfd` · version 1 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |
| Runs on | NVIDIA GPU |

## Inputs

| Port | Type | Description |
|---|---|---|
| `models` Car models | Files (stl, obj, glb, gltf, ply, off) | One car per file; the length along X with the nose at the smallest X and Z up by default (see the settings) Several connections. Optional. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `tunnel` Tunnel results (View) | Files (gz) | <model>.tunnel.json.gz (esasim.windtunnel/1) for the Wind tunnel view |
| `results` Results | Table (csv) | results.csv: one row per car: Cd, Cl, Cs, frontal area, CdA, drag, lift, drag power |
| `history` Convergence | Table (csv) | convergence.csv: model, t (flow-through times), cd, cl |
| `surfaces` Pressure surfaces | Files (ply) | <model>_cp.ply: the surface coloured by Cp, with a cp vertex property |
| `models` Sample cars | Files (stl) | The built-in cars used, as STL |
| `report` Report | Text (md) |  |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `samples` Sample cars | text | `"auto"` | auto: the four samples when no files are wired; or a list: fastback, notchback, estate, suv, pickup, van, sports, ahmed25; all; none |
| `resolution` Resolution (cells per car length) | select | `"96 (standard)"` |  |
| `speed_kmh` Wind speed (km/h) | number | `120` |  |
| `flow_time` Flow-through times | number | `8` | How long each car is simulated, in car lengths of air passing by; the last ~55% is averaged |
| `length_axis` Length axis (files) | select | `"x"` |  |
| `up_axis` Up axis (files) | select | `"z"` |  |
| `nose` Nose at | select | `"min"` | Whether the front of the car is at the smallest or the largest coordinate of the length axis |
| `units` Units (files) | select | `"auto"` |  |
| `reynolds` LES Reynolds number cap | number | `1000000` |  |
| `smagorinsky` Smagorinsky constant | number | `0.17` |  |
| `wall_slip` Wall slip (0 no-slip, 1 free-slip) | number | `0.85` |  |
| `max_triangles` Triangles in the View | number | `160000` |  |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
