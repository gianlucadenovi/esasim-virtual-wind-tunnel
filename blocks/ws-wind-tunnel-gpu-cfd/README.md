# Wind tunnel (GPU CFD)

A virtual wind tunnel for car models: lattice-Boltzmann LES on the GPU (NVIDIA Warp) gives drag, lift, surface pressure, streamlines and the flow field for real-time smoke, for each GLB/STL/OBJ car.

Wire car models (GLB/glTF, STL, OBJ, PLY, OFF; one car per file) into Car models, for example from a Dataset block. Each car is turned so its length runs along the wind and its wheels stand on the road: by default the longest side is the length, glTF files are Y-up (others Z-up), the taller end is the rear, and mm or cm are scaled to metres (set Length axis, Up axis, Nose at or Units to override). Models drawn at the wrong size (common on Sketchfab) are rescaled with Real lengths: one line per car, a part of its file name = its real length in metres (countach = 4.87). Cd and Cl do not depend on the size; forces in newtons and power do. It is voxelized and simulated in turn: D3Q19 lattice Boltzmann with a regularized collision and a Smagorinsky LES model, a partial-slip wall model on the body, slip floor (like a rolling road), velocity inlet, pressure outlet with a sponge. The grid must fit in the GPU's memory (about 200 bytes a cell): a car too big for the chosen Resolution is run at the finest resolution that fits, and the log says so. Forces come from momentum exchange, averaged over the last part of the run. Outputs for the Wind tunnel view: <model>.tunnel.json.gz (surface pressure, streamlines, slices, history, transform), <model>.field.bin.gz (mean velocity, pressure and turbulence around the car, for the real-time smoke) and the original <model>.source.glb with its materials. Also results.csv, convergence.csv, surfaces coloured by Cp (PLY) and a report. Sample cars (fastback, notchback, estate, suv, pickup, van, sports, ahmed25, all) only when asked in Sample cars.

An [EsaSim](https://esacode.com/) blueprint block: it runs on a worker, in Python (`backend.py`, `def run(ctx)`).

| | |
|---|---|
| Block | `ws-wind-tunnel-gpu-cfd` · version 5 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |
| Runs on | NVIDIA GPU |

## Inputs

| Port | Type | Description |
|---|---|---|
| `models` Car models | Files (glb, gltf, stl, obj, ply, off) | One car per file; orientation and units are found automatically (see the settings) Several connections. Optional. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `tunnel` Tunnel results (View) | Files (gz, glb, gltf) | <model>.tunnel.json.gz, <model>.field.bin.gz and <model>.source.glb for the Wind tunnel view |
| `results` Results | Table (csv) | results.csv: one row per car: Cd, Cl, Cs, frontal area, CdA, drag, lift, drag power |
| `history` Convergence | Table (csv) | convergence.csv: model, t (flow-through times), cd, cl |
| `surfaces` Pressure surfaces | Files (ply) | <model>_cp.ply: the surface coloured by Cp, with a cp vertex property |
| `models` Sample cars | Files (stl) | The built-in cars used, as STL |
| `report` Report | Text (md) |  |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `samples` Sample cars | text | `"none"` | none: only the cars wired in; or a list of built-in cars: fastback, notchback, estate, suv, pickup, van, sports, ahmed25; all; auto: the samples when no files are wired |
| `resolution` Resolution (cells per car length) | select | `"128 (fine)"` | Lowered for a car whose grid would not fit in the GPU's memory (the log says so) |
| `speed_kmh` Wind speed (km/h) | number | `120` |  |
| `flow_time` Flow-through times | number | `8` | How long each car is simulated, in car lengths of air passing by; the last ~55% is averaged |
| `real_lengths` Real lengths | textarea | `""` | Models drawn at the wrong size: one line per car, a part of its file name = its real length in metres, e.g. countach = 4.87 |
| `length_axis` Length axis (files) | select | `"auto"` |  |
| `up_axis` Up axis (files) | select | `"auto"` | auto: Y for glTF/GLB (the glTF standard), Z for the others |
| `nose` Nose at | select | `"auto"` | auto: the taller end is taken as the rear; min / max: the front is at the smallest / largest coordinate of the length axis |
| `units` Units (files) | select | `"auto"` |  |
| `reynolds` LES Reynolds number cap | number | `1000000` |  |
| `smagorinsky` Smagorinsky constant | number | `0.17` |  |
| `wall_slip` Wall slip (0 no-slip, 1 free-slip) | number | `0.85` |  |
| `max_triangles` Triangles in the View (STL/OBJ) | number | `160000` |  |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
