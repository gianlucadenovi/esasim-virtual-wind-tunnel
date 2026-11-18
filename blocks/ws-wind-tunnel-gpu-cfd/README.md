# Wind tunnel (GPU CFD)

A virtual wind tunnel for car models: lattice-Boltzmann LES on the GPU (NVIDIA Warp) gives drag, lift, surface pressure, streamlines and the flow field for real-time smoke, for each GLB/STL/OBJ car.

An [EsaSim](https://esacode.com/) blueprint block: it runs on a worker, in Python (`backend.py`, `def run(ctx)`).

| | |
|---|---|
| Block | `ws-wind-tunnel-gpu-cfd` · version 2 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |
| Runs on | Any worker |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
