# Wind tunnel view

The wind tunnel in 3D: each car with its own materials, its surface pressure or paint, and realistic smoke from a wand you move in real time through the computed flow; drag compared across models.

Wire the Wind tunnel block's Tunnel results into Tunnel and its live telemetry (through a Telemetry block) into Live. Pick a model; Car: Original shows its own materials (GLB/glTF), Pressure paints the surface pressure Cp on the same geometry, Paint shows a neutral finish. Smoke: a smoke wand stands in front of the car; drag its yellow handle (or use the sliders: jets, vertical/horizontal rake or a single point, height, side, spacing, distance ahead, density, slow motion, colour) and the smoke follows the run's time-averaged flow, interpolated wherever the wand is, and spreads where the flow is turbulent. Streamlines and centre or horizontal slices (speed or pressure) are there too; the Wind slider gives drag force and power at that speed. Run tunnel starts a new run with the chosen resolution and wind speed (the Wind tunnel node id is set in Tunnel node). Orbit with the mouse, right-drag to pan, scroll to zoom.

An [EsaSim](https://esacode.com/) blueprint block: a view that draws in the browser, in JavaScript (`frontend.js`, `function render(ctx)`).

| | |
|---|---|
| Block | `ws-wind-tunnel-view` · version 2 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |

## Inputs

| Port | Type | Description |
|---|---|---|
| `tunnel` Tunnel results | Files (gz, glb, gltf, json) | <model>.tunnel.json.gz, <model>.field.bin.gz and <model>.source.glb from the Wind tunnel block Several connections. |
| `live` Live | Stream | The Wind tunnel block's live telemetry (channel tunnel) Several connections. Optional. |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `tunnel_node` Tunnel node | text | `"tunnel"` | The node id of the Wind tunnel block that Run tunnel sets the resolution and speed of |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
