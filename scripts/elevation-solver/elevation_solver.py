
import os
import re
import yaml
import numpy as np
from collections import defaultdict

HEX_DIR = '/Users/alexgs/projects/skyreach/data/hexes'
RIVER_DIR = '/Users/alexgs/projects/skyreach/data/map-paths/rivers'
OUTPUT_PATCH = '/Users/alexgs/projects/skyreach/data/patches/elevation/elevation-solver-patch.yaml'

BIOME_TARGET = {
    "coastal-ocean": 0,
    "freshwater-lake": 1800,
    "marsh": 1200,
    "swamp": 800,
    "coastal-swamp": 400,
    "coastal-prairie": 200,
    "prairie": 2400,
    "temperate-rainforest": 2000,
    "temperate-forest": 4200,
    "temperate-woodland": 3500,
    "mixed-woodland": 2800,
    "boreal-forest": 4600,
    "moors": 5200,
    "montane-grassland": 6900,
    "montane-forest": 7500,
    "rocky-highland": 8800,
    "alpine-tundra": 9800,
    "glacier": 11000,
}

BIOME_TENSION = {
    "coastal-ocean": 0.1,
    "freshwater-lake": 0.2,
    "marsh": 0.2,
    "swamp": 0.2,
    "coastal-swamp": 0.2,
    "coastal-prairie": 0.3,
    "prairie": 0.3,
    "temperate-rainforest": 0.4,
    "temperate-forest": 0.4,
    "temperate-woodland": 0.4,
    "mixed-woodland": 0.4,
    "boreal-forest": 0.5,
    "moors": 0.3,
    "montane-grassland": 0.6,
    "montane-forest": 0.7,
    "rocky-highland": 0.8,
    "alpine-tundra": 0.9,
    "glacier": 1.0,
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
        if 0 <= n_col < 26 and 0 < n_row <= 99:
            letter = chr(n_col + ord('a'))
            neighbor_id = f"{letter}{n_row}"
            if neighbor_id in all_hexes:
                neighbors.append(neighbor_id)
    return neighbors

def load_hex_data():
    hex_data = {}
    for region in os.listdir(HEX_DIR):
        region_path = os.path.join(HEX_DIR, region)
        if not os.path.isdir(region_path):
            continue
        for file in os.listdir(region_path):
            if file.endswith('.yaml'):
                path = os.path.join(region_path, file)
                with open(path) as f:
                    data = yaml.safe_load(f)
                    hex_id = data.get('id')
                    biome = data.get('biome', 'unknown')
                    avg = data.get('avgElevation', 0)
                    hex_data[hex_id] = {
                        'biome': biome,
                        'avgElevation': avg,
                        'neighbors': [],  # will fill later
                        'flowTo': set()
                    }
    return hex_data

def load_river_flows(hex_data):
    river_path = os.path.join(RIVER_DIR)
    for file in os.listdir(river_path):
        with open(os.path.join(river_path, file)) as f:
            data = yaml.safe_load(f)
            points = data.get('points', [])
            prev_hex = None
            for point in points:
                parts = point.split(':')
                if len(parts) == 2:
                    current = parts[0]
                    if prev_hex and prev_hex in hex_data and current in hex_data:
                        hex_data[prev_hex]['flowTo'].add(current)
                    prev_hex = current

def relax(hex_data, iterations=25, step_size=200):
    for hex_id in hex_data:
        hex_data[hex_id]['neighbors'] = get_neighbors(hex_id, hex_data)

    for _ in range(iterations):
        updated = {}
        for hex_id, data in hex_data.items():
            current = data['avgElevation']
            biome = data['biome']
            target = BIOME_TARGET.get(biome, current)
            tension = BIOME_TENSION.get(biome, 0.5)
            neighbor_ids = data['neighbors']
            if not neighbor_ids:
                updated[hex_id] = current
                continue

            neighbor_vals = [hex_data[n]['avgElevation'] for n in neighbor_ids]
            # Add river-weighted influence
            for down_hex in data['flowTo']:
                if down_hex in hex_data:
                    neighbor_vals.append(hex_data[down_hex]['avgElevation'] - 300)

            neighbor_avg = np.mean(neighbor_vals)
            desired = 0.5 * target + 0.5 * neighbor_avg
            delta = desired - current
            delta = np.clip(delta, -step_size, step_size)
            updated[hex_id] = round(current + delta)

        for hex_id in updated:
            hex_data[hex_id]['avgElevation'] = updated[hex_id]

def write_patch(hex_data, output_path):
    patch = {}
    for hex_id, data in hex_data.items():
        avg = data['avgElevation']
        tension = BIOME_TENSION.get(data['biome'], 0.5)
        spread = 1000
        patch[hex_id] = {
            'avgElevation': int(avg),
            'minElevation': int(avg - spread * (1 - tension)),
            'maxElevation': int(avg + spread * tension)
        }
    with open(output_path, 'w') as f:
        yaml.dump(patch, f, sort_keys=True)

if __name__ == '__main__':
    hexes = load_hex_data()
    load_river_flows(hexes)
    relax(hexes)
    write_patch(hexes, OUTPUT_PATCH)
