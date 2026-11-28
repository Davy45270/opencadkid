# Word search: image credits

The owl mascot (`motsmeles-chouette.webp`) and the game logo (`motsmeles-logo.webp`) are cut, not redrawn, from
the asset sheet drawn by Davy45270 for this game (`OpenCadeKids_Mots_Meles_transparent.png`, SHA-256
`e103e95386db1f0897264315fb0091990471b7118fce72c73bae67d00d2c4513`).

- Licence of these two images: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0),
  attribution « Davy45270 ». The code of the game stays under the MIT licence of the repository.
- Cutting table: `decoupe.json` (box `width, height, x, y` on the sheet, 4 px margin, anchor, size, encoder).
- Measure: RMSE between each WebP and the sheet cropped to its box (flattened on grey, same resize): 0.016 for the
  owl, 0.019 for the logo, under 0.02. A circle drawn by code in place of the owl gives 0.27.
