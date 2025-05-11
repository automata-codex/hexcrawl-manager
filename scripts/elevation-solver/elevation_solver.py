#!/usr/bin/env python3
import os
import re
import yaml
import numpy as np

HEX_DIR = '/Users/alexgs/projects/skyreach/data/hexes'
RIVER_DIR = '/Users/alexgs/projects/skyreach/data/map-paths/rivers'
OUTPUT_PATCH = '/Users/alexgs/projects/skyreach/data/patches/elevation/elevation-solver-patch.yaml'

# Elevation ranges per biome
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
}

# Tension: 0.0 = flat/loose, 1.0 = steep/rigid
BIOME_TENSION = {
    "coastal-ocean": 0.0,
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
                        'fixed': biome == 'coastal-ocean',
                        'neighbors': [],
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

def biome_bias_force(elev, biome_min, biome_max):
    if elev < biome_min:
        return biome_min - elev  # pull upward
    elif elev > biome_max:
        return biome_max - elev  # pull downward
    else:
        return 0  # no force

def relax(hex_data, iterations=25, step_size=200):
    for hex_id in hex_data:
        hex_data[hex_id]['neighbors'] = get_neighbors(hex_id, hex_data)

    for _ in range(iterations):
        updated = {}
        for hex_id, data in hex_data.items():
            if data['fixed']:
                updated[hex_id] = data['avgElevation']
                continue

            current = data['avgElevation']
            biome = data['biome']
            biome_min, biome_max = BIOME_RANGES.get(biome, (current - 500, current + 500))
            tension = BIOME_TENSION.get(biome, 0.5)
            bias = biome_bias_force(current, biome_min, biome_max)

            neighbor_ids = data['neighbors']
            neighbor_vals = [hex_data[n]['avgElevation'] for n in neighbor_ids]

            for down_hex in data['flowTo']:
                if down_hex in hex_data:
                    neighbor_vals.append(hex_data[down_hex]['avgElevation'] - 300)

            neighbor_avg = np.mean(neighbor_vals) if neighbor_vals else current
            desired = current + 0.5 * bias + 0.5 * (neighbor_avg - current)
            delta = np.clip(desired - current, -step_size, step_size)
            updated[hex_id] = round(current + delta)

        for hex_id in updated:
            hex_data[hex_id]['avgElevation'] = updated[hex_id]

    # Enforce: minElevation ≤ min(neighbor.maxElevation)
    for hex_id, data in hex_data.items():
        tension = BIOME_TENSION.get(data['biome'], 0.5)
        neighbor_ids = data['neighbors']
        neighbor_maxes = [hex_data[n]['avgElevation'] + 1000 * BIOME_TENSION.get(hex_data[n]['biome'], 0.5)
                          for n in neighbor_ids if n in hex_data]
        if neighbor_maxes:
            max_min = min(neighbor_maxes)
            if not data['fixed']:
                data['minElevation'] = min(data['avgElevation'], max_min)
            else:
                data['minElevation'] = 0
        else:
            data['minElevation'] = data['avgElevation']

        data['maxElevation'] = round(data['avgElevation'] + 1000 * tension)
        data['minElevation'] = round(data['minElevation'])

def write_patch(hex_data, output_path):
    patch = {}
    for hex_id, data in hex_data.items():
        patch[hex_id] = {
            'avgElevation': int(data['avgElevation']),
            'minElevation': int(data['minElevation']),
            'maxElevation': int(data['maxElevation']),
        }
    with open(output_path, 'w') as f:
        yaml.dump(patch, f, sort_keys=True)

if __name__ == '__main__':
    hexes = load_hex_data()
    load_river_flows(hexes)
    relax(hexes)
    write_patch(hexes, OUTPUT_PATCH)
