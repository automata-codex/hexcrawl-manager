import yaml
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Paths
CLUES_DIR = Path("../../data/floating-clues")  # Adjust this to your repo's real clue path
HEXES_DIR = Path("../../data/hexes")           # Adjust this to your repo's real hex path
OUTPUT_FILE = Path("output/clue-links.yaml")

# Settings
TOP_N_MATCHES = 3

# Load model
print("🔮 Loading sentence transformer model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

# Load clues
def load_clues():
    clues = []
    clue_files = list(CLUES_DIR.glob("**/*.yml")) + list(CLUES_DIR.glob("**/*.yaml"))
    for file in clue_files:
        with open(file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            clues.append({
                "id": data["id"],
                "text": f"{data['name']}: {data['summary']}" # TODO Expand this to include the `detailText` field (which contains markdown)
            })
    return clues

# Load hexes
def load_hexes():
    hexes = []
    hex_files = list(HEXES_DIR.glob("**/*.yml")) + list(HEXES_DIR.glob("**/*.yaml"))
    for file in hex_files:
        with open(file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            text_parts = []

            # Landmark is a single string
            if "landmark" in data:
                text_parts.append(data["landmark"])

            # hiddenSites is a list of strings or dicts
            if "hiddenSites" in data:
                for hs in data["hiddenSites"]:
                    if isinstance(hs, str):
                        text_parts.append(hs)
                    elif isinstance(hs, dict):
                        text_parts.append(hs.get("description", ""))

            # notes is a list of strings
            if "notes" in data:
                for note in data["notes"]:
                    text_parts.append(note)

            # Safely flatten and string-ify everything
            flat_text_parts = []
            for part in text_parts:
                if isinstance(part, list):
                    for subpart in part:
                        flat_text_parts.append(str(subpart))
                else:
                    flat_text_parts.append(str(part))

            text = "\n".join(flat_text_parts)

            hexes.append({
                "id": data["slug"],
                "text": text
            })

    return hexes

# Main logic
def main():
    print("📚 Loading clues and hexes...")
    clues = load_clues()
    hexes = load_hexes()

    print(f"🧠 Encoding {len(clues)} clues and {len(hexes)} hexes...")
    clue_embeddings = model.encode([c["text"] for c in clues])
    hex_embeddings = model.encode([h["text"] for h in hexes])

    print("📈 Computing cosine similarity...")
    similarity_matrix = cosine_similarity(clue_embeddings, hex_embeddings)

    print("🔗 Selecting top matches...")
    output = []
    for i, clue in enumerate(clues):
        similarity_scores = similarity_matrix[i]
        top_indices = np.argsort(similarity_scores)[::-1][:TOP_N_MATCHES]
        linked_hexes = [hexes[j]["id"] for j in top_indices]
        output.append({
            "clueId": clue["id"],
            "linkedHexes": linked_hexes # TODO Output scores, too
        })

    print(f"💾 Writing output to {OUTPUT_FILE}...")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        yaml.dump(output, f, sort_keys=False)

    print("✅ Done!")

if __name__ == "__main__":
    main()
