# Car models

Put the cars you want to test in the wind tunnel here: one car per file, as STL, OBJ, GLB/glTF, PLY or OFF.

- Units: metres, centimetres or millimetres are detected from the size (or set *Units* on the Wind tunnel block).
- Orientation: by default the car's length runs along X with the nose at the smallest X, and Z is up. Change *Length axis*, *Up axis* and *Nose at* on the Wind tunnel block if your files differ (many exports use Y up).
- The mesh does not need to be watertight: small gaps are closed when it is voxelized. Wheels should touch the ground plane (the lowest point is placed on the road).
- The file name (without its extension) is the model's name in the results.

While this dataset holds no car files, the flow uses the built-in sample cars (fastback, SUV, pickup, sports car).
