#!/usr/bin/env python3
import argparse
import os
import re
import yaml
import numpy as np

HEX_DIR = '/Users/alexgs/projects/skyreach/data/hexes'
RIVER_DIR = '/Users/alexgs/projects/skyreach/data'
OUTPUT_PATCH = '/Users/alexgs/projects/skyreach/data/patches/elevation/elevation-solver-patch.yaml'

# Soft biome elevation ranges (used for biasing)
BIOME_RANGES = {
    "coastal-ocean": (0, 0),
    "freshwater-lake": (0, 6500),
    "marsh": (0, 2000),
    "swamp": (0, 1000),
    "coastal-swamp": (0, 500),
    "coastal-prairie": (0, 650),
    "prairie": (500, 3300),
    "temperate-rainforest": (0, 3300),
    "temperate-forest": (500, 3300),
    "temperate-woodland": (300, 2600),
    "mixed-woodland": (500, 3300),
    "boreal-forest": (1000, 5000),
    "moors": (1300, 4000),
    "montane-grassland": (3300, 7200),
    "montane-forest": (3300, 8200),
    "rocky-highland": (3300, 9800),
    "alpine-tundra": (9800, 13000),
    "glacier": (10000, 14000),
    "lowland-tundra": (0, 1800),
    "subalpine-woodland": (6000, 9800),
}

def parse_hex_id(hex_id):
    match = re.match(r'^([a-z]+)(\d+)$', hex_id)
    if match:
        col = ord(match.group(1)) - ord('a')
        row = int(match.group(2))
        return col, row
    return None, None

def get_neighbors(hex_id, all_hexes):
    col, row = parse_hex_id(hex_id)
    if col is None:
        return []

    offsets_even = [(-1, 0), (-1, +1), (0, -1), (0, +1), (+1, 0), (+1, +1)]
    offsets_odd = [(-1, -1), (-1, 0), (0, -1), (0, +1), (+1, -1), (+1, 0)]
    offsets = offsets_odd if col % 2 else offsets_even

    neighbors = []
    for dc, dr in offsets:
        n_col = col + dc
        n_row = row + dr
        letter = chr(n_col + ord('a'))
        neighbor_id = f"{letter}{n_row}"

        if neighbor_id in all_hexes:
            neighbors.append(neighbor_id)
        else:
            # Off-map edge logic
            if n_row > 99 or n_col > 25:
                neighbors.append(('coastal-ocean', 0))
            elif n_row == 0:
                if neighbor_id in ['a0', 'b0']:
                    neighbors.append(('lowland-tundra', 0))
                elif neighbor_id == 't0':
                    neighbors.append(('glacier', 11000))
                else:
                    neighbors.append(('alpine-tundra', 10000))
            elif n_col == 23:  # Column X
                if neighbor_id == 'x26':
                    neighbors.append(('subalpine-woodland', 8000))
                elif neighbor_id == 'x27':
                    neighbors.append(('temperate-rainforest', 2000))
                else:
                    neighbors.append(('alpine-tundra', 9500))
    return neighbors

def load_hex_data():
    hex_data = {}
    for region in os.listdir(HEX_DIR):
        region_path = os.path.join(HEX_DIR, region)
        if not os.path.isdir(region_path):
            continue
        for file in os.listdir(region_path):
            if file.endswith('.yaml'):
                with open(os.path.join(region_path, file)) as f:
                    data = yaml.safe_load(f)
                    hex_id = data.get("id")
                    biome = data.get("biome", "unknown")
                    avg = data.get("avgElevation", 0)
                    hex_data[hex_id] = {
                        "biome": biome,
                        "avgElevation": avg,
                        "fixed": biome == "coastal-ocean",
                        "flowTo": set(),
                        "neighbors": []
                    }
    return hex_data

def load_river_flows(hex_data):
    river_path = os.path.join(RIVER_DIR, "map-paths", "rivers")
    for file in os.listdir(river_path):
        with open(os.path.join(river_path, file)) as f:
            data = yaml.safe_load(f)
            points = data.get("points", [])
            prev = None
            for p in points:
                parts = p.split(":")
                if len(parts) == 2:
                    hex = parts[0]
                    if prev and prev in hex_data and hex in hex_data:
                        hex_data[prev]["flowTo"].add(hex)
                    prev = hex

def biome_bias_force(elev, bmin, bmax):
    if elev < bmin:
        return bmin - elev
    elif elev > bmax:
        return bmax - elev
    else:
        return 0

def relax(hex_data, iterations=25, step_size=200, zero_init=False, threshold=None):
    for hex_id in hex_data:
        hex_data[hex_id]["neighbors"] = get_neighbors(hex_id, hex_data)
        if zero_init and not hex_data[hex_id]["fixed"]:
            hex_data[hex_id]["avgElevation"] = 0

    for i in range(iterations):
        updates = {}
        total_change = 0
        for hex_id, data in hex_data.items():
            if data["fixed"]:
                updates[hex_id] = data["avgElevation"]
                continue

            biome = data["biome"]
            avg = data["avgElevation"]
            bmin, bmax = BIOME_RANGES.get(biome, (avg - 1000, avg + 1000))
            bias = biome_bias_force(avg, bmin, bmax)

            neighbor_vals = []
            for n in data["neighbors"]:
                if isinstance(n, str):
                    neighbor_vals.append(hex_data[n]["avgElevation"])
                elif isinstance(n, tuple):
                    _, elev = n
                    neighbor_vals.append(elev)

            for down in data["flowTo"]:
                if down in hex_data:
                    neighbor_vals.append(hex_data[down]["avgElevation"] - 300)

            neighbor_avg = np.mean(neighbor_vals) if neighbor_vals else avg
            desired = avg + 0.5 * bias + 0.5 * (neighbor_avg - avg)
            delta = np.clip(desired - avg, -step_size, step_size)
            new_val = round(avg + delta)
            total_change += abs(new_val - avg)
            updates[hex_id] = new_val

        for h in updates:
            hex_data[h]["avgElevation"] = updates[h]

        if iterations > 250:
            if (i + 1) % 10 == 0 or i == iterations - 1:
                print(f"Iteration {i+1}/{iterations}: total change = {total_change}")
        else:
            print(f"Iteration {i+1}: total change = {total_change}")

        if threshold and total_change < threshold:
            print(f"Convergence threshold ({threshold}) reached. Stopping early.")
            break

def write_patch(hex_data, output_path):
    patch = {
        hex_id: {"avgElevation": int(data["avgElevation"])}
        for hex_id, data in hex_data.items()
    }
    with open(output_path, "w") as f:
        yaml.dump(patch, f, sort_keys=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--zero-init', action='store_true', help='Start all elevations at 0')
    parser.add_argument('--iterations', type=int, default=25, help='Max number of iterations')
    parser.add_argument('--threshold', type=int, default=None, help='Early stopping threshold')
    args = parser.parse_args()

    hexes = load_hex_data()
    load_river_flows(hexes)
    relax(hexes, iterations=args.iterations, zero_init=args.zero_init, threshold=args.threshold)
    write_patch(hexes, OUTPUT_PATCH)

if __name__ == "__main__":
    main()
