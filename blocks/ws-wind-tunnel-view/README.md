# Wind tunnel view

The wind tunnel in 3D: each car with its surface pressure, streamlines, moving particles and flow slices; pick a model, change the wind speed, compare drag; the flow forms live while the tunnel runs.

Wire the Wind tunnel block's Tunnel results into Tunnel and its Live telemetry into Live. Pick a model in the bar (or click a row of the table), colour the car by pressure (Cp) or paint, show streamlines and particles riding them, a centre or horizontal slice of the flow (speed or pressure), and move the Wind slider to see drag force and power at that speed (same Cd). Run tunnel starts a new run with the chosen resolution and wind speed (the Wind tunnel node's id is set in Tunnel node). Drag to orbit, right-drag or shift-drag to pan, scroll to zoom. While a run goes on, the side panel shows the centre-plane flow forming around the car and the running Cd.

An [EsaSim](https://esacode.com/) blueprint block: a view that draws in the browser, in JavaScript (`frontend.js`, `function render(ctx)`).

| | |
|---|---|
| Block | `ws-wind-tunnel-view` · version 1 |
| Workspace | Gianluca De Novi's workspace |
| Author | Gianluca De Novi |

## Inputs

| Port | Type | Description |
|---|---|---|
| `tunnel` Tunnel results | Files (gz, json) | <model>.tunnel.json.gz from the Wind tunnel block Several connections. |
| `live` Live | Stream | The Wind tunnel block's live telemetry (channel tunnel) Several connections. Optional. |

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `tunnel_node` Tunnel node | text | `"tunnel"` | The node id of the Wind tunnel block that Run tunnel sets the resolution and speed of |

## Use it in EsaSim

In a workspace, open **Projects > Blocks > New block**, choose this kind of block, copy the ports and settings above and paste the code; or ask an AI assistant connected to EsaSim (MCP) to create it from this folder.
