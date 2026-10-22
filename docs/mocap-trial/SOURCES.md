# mocap-trial - sources

Source: CMU Graphics Lab Motion Capture Database, http://mocap.cs.cmu.edu/ (ASF skeleton + AMC motion, 120 fps).
Licence (home page): "This data is free for use in research projects. You may include this data in commercially-sold
products, but you may not resell this data directly, even in converted form." Acknowledgement text the site asks for:
"The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF
EIA-0196217."

Raw files go to `.mocap-cache/` (gitignored). URL pattern: http://mocap.cs.cmu.edu/subjects/<S>/<S>.asf and
http://mocap.cs.cmu.edu/subjects/<S>/<S>_<NN>.amc.

## Candidate takes (from the site's locomotion lists; used = marked after the retarget)
| Take | Description | For |
| --- | --- | --- |
| 16_15, 16_16, 16_21, 16_22, 16_31, 16_32 | walk | walk loop |
| 16_35, 16_36, 16_45, 16_46, 16_56 | run/jog | jog loop |
| 16_55 | run | run loop |
| 16_17, 16_18 / 16_19, 16_20 | walk, 90-degree left / right turn | walk turn on the move |
| 16_41, 16_42 / 16_43, 16_44 | run/jog, 90-degree left / right turn | jog turn |
| 16_51, 16_52 / 16_53, 16_54 | run, 90-degree left / right turn | run turn |
| 16_08, 16_57 | run/jog, sudden stop | jog stop |
| 16_33, 16_34 | slow walk, stop | walk stop |
| 35_01, 35_02, 35_03 | walk | walk loop (second performer) |
| 35_17, 35_18, 35_19 | run/jog | jog loop (second performer) |
| 69_13, 69_14 | walk, turn in place (repeated) | turn in place |
Skeletons: 16.asf, 35.asf, 69.asf.

## Weapons (later step, not downloaded)
To list from the site's search (gun / rifle / aim / carry) when the weapon step starts.
