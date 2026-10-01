# South Valley Outdoor Learning Resources Map

First working version of a static, CSV-driven interactive map for South Valley outdoor learning resources.

## What it does

- Interactive Leaflet map
- Clickable markers and resource cards
- Filter by resource type
- Filter by learning topic
- Search by name, description, address, topic, etc.
- Resource popups with description, location, tags, and website
- CSV download
- Responsive layout for phones and desktops
- No database or build process
- Ready for GitHub Pages

## Edit the data

The main data file is `data/assets.csv`. Add one resource per row.

Required columns:

`id,name,type,topics,resource_types,address,latitude,longitude,description,website,contact,source`

Use semicolons inside `topics` and `resource_types` when a resource has multiple values.

## Run locally

Because the map loads the CSV with JavaScript, use a small local web server rather than double-clicking `index.html`.

For example, from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a GitHub repository.
2. Upload the contents of this folder.
3. In GitHub, open **Settings → Pages**.
4. Select **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)`.
6. Save. GitHub will provide the public site URL.

## Important data note

Coordinates and asset information should be spot-checked periodically before treating the map as an authoritative public resource directory.

The map opens with Esri World Imagery satellite imagery. A Street map option using OpenStreetMap is available from the visible Satellite / Street map toggle. Review the tile providers' current usage/attribution requirements before a larger public deployment.
