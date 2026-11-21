"""Turns the raw site photos and videos into web files under src/assets/.

Raw files stay outside the repo (MEDIA_IN, default ../architect-portfolio/media-inbox).
Every output is re-encoded, which drops EXIF/GPS and any other metadata.
Usage: python scripts/media.py
"""
import glob, json, os, subprocess, sys
from PIL import Image, ImageFilter, ImageOps

IN = os.environ.get("MEDIA_IN", os.path.join(os.path.dirname(__file__), "..", "..", "architect-portfolio", "media-inbox"))
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "assets")

# number in the inbox -> (slug, category, title, blur boxes as (x0, y0, x1, y1) on the original)
PHOTOS = {
    # kitchens
    "64": ("curved-black-kitchen", "kitchen", "Curved black gloss kitchen", []),
    "66": ("curved-black-kitchen-wide", "kitchen", "Curved kitchen with pendant lights", []),
    "45": ("champagne-marble-kitchen", "kitchen", "Champagne kitchen, lit counters", []),
    "47": ("champagne-fluted-glass", "kitchen", "Fluted glass uppers", []),
    "88": ("grey-track-light-kitchen", "kitchen", "Grey kitchen with track lights", []),
    "89": ("grey-kitchen-tall-units", "kitchen", "Tall units and wicker pull-out", []),
    "67": ("grey-marble-kitchen", "kitchen", "Grey L-shaped kitchen", []),
    "08": ("island-kitchen", "kitchen", "Kitchen island with cove light", []),
    "22": ("white-teal-kitchen", "kitchen", "White and teal kitchen", []),
    "36": ("grey-wood-kitchen", "kitchen", "Grey and wood kitchen", []),
    "74": ("mint-wood-kitchen", "kitchen", "Mint and walnut kitchen", []),
    "128": ("terracotta-kitchen", "kitchen", "Terracotta tile kitchen", []),
    "09": ("crockery-bar", "kitchen", "Crockery unit and breakfast bar", []),
    # wardrobes
    "69": ("dark-marble-wardrobe", "wardrobe", "Stone-finish sliding wardrobe", []),
    "71": ("dark-marble-dresser", "wardrobe", "Wardrobe with built-in dresser", []),
    "91": ("white-gold-wardrobe", "wardrobe", "White wardrobe, brass handles", []),
    "94": ("taupe-wardrobe-lit-mirror", "wardrobe", "Taupe wardrobe and lit mirror", []),
    "72": ("white-bronze-wardrobe", "wardrobe", "Gloss sliding wardrobe", []),
    "68": ("blue-stone-wardrobe", "wardrobe", "Wardrobe with study nook", []),
    "79": ("window-seat-wardrobes", "wardrobe", "Twin wardrobes and window seat", []),
    "03": ("concrete-wardrobe", "wardrobe", "Concrete-look wardrobe", []),
    "15": ("mirror-sliding-wardrobe", "wardrobe", "Mirrored sliding wardrobe", []),
    "59": ("grey-wood-sliding-wardrobe", "wardrobe", "Grey and wood sliding wardrobe", []),
    "14": ("chevron-wardrobe", "wardrobe", "Chevron wardrobe and desk", []),
    "131": ("beige-wardrobe", "wardrobe", "Matte beige wardrobe", []),
    # living, TV units and walls
    "85": ("lit-arch-feature-wall", "living", "Lit arch feature wall", []),
    "84": ("tv-unit-lit-niche", "living", "TV unit with lit display niche", []),
    "70": ("marble-copper-tv-panel", "living", "Marble TV panel, copper inlays", []),
    "134": ("slatted-tv-wall", "living", "Slatted TV wall and display unit", []),
    "55": ("textured-tv-wall", "living", "Textured TV wall", []),
    "06": ("fluted-marble-tv-unit", "living", "Fluted TV unit", []),
    "44": ("sage-tv-unit", "living", "Sage TV wall", []),
    "86": ("arch-wainscot-wall", "living", "Arched wall panelling", []),
    "90": ("sage-panelled-wall", "living", "Sage panelled wall", []),
    "17": ("fluted-partition", "living", "Fluted partition and shelves", []),
    "20": ("glass-kitchen-partition", "living", "Glass kitchen partition", []),
    "43": ("lit-crockery-unit", "living", "Lit crockery unit", []),
    "41": ("ganesha-pooja-unit", "living", "Pooja unit, Ganesha cut-out", [(80, 355, 172, 415)]),
    "28": ("foyer-shoe-cabinet", "living", "Foyer shoe cabinet", []),
    # ceilings and lighting
    "82": ("wave-ceiling", "ceiling", "Wave false ceiling", []),
    "83": ("arch-corridor-ceiling", "ceiling", "Cove ceiling over arched panels", []),
    "125": ("wood-slat-ceiling", "ceiling", "Wood slat ceiling, wall lights", []),
    "35": ("bedroom-cove-ceiling", "ceiling", "Bedroom cove ceiling", []),
    "30": ("study-cove-ceiling", "ceiling", "Study under a cove ceiling", []),
    # bedrooms and study
    "57": ("green-panel-headboard", "bedroom", "Green panelled headboard wall", []),
    "96": ("leaf-wallpaper-panels", "bedroom", "Framed leaf wallpaper", []),
    "16": ("fluted-headboard-bedroom", "bedroom", "Fluted headboard and wardrobe", []),
    "126": ("upholstered-bed", "bedroom", "Upholstered bed, marble wardrobe", []),
    "18": ("kids-room-blue", "bedroom", "Kids' room in blue and white", []),
    "02": ("hydraulic-bed", "bedroom", "Bed with hydraulic storage", []),
    "50": ("fluted-glass-study", "bedroom", "Study with fluted glass tower", []),
    "52": ("study-wall-shelves", "bedroom", "Study desk and wall shelves", []),
    "58": ("metal-frame-study", "bedroom", "Metal frame study shelves", []),
    "60": ("green-bedroom-wardrobe", "bedroom", "Corner wardrobe, green wall", []),
    # office
    "141": ("office-reception", "office", "Office reception", [(110, 515, 310, 590)]),
    "135": ("office-meeting-room", "office", "Meeting room, chevron wall", []),
    "146": ("office-meeting-room-2", "office", "Meeting room", []),
    "145": ("office-glass-cabins", "office", "Glass cabins", []),
    "147": ("office-pantry", "office", "Office pantry", []),
    "137": ("office-storage", "office", "Full-height storage", []),
}

VIDEOS = {"video-01": "walkthrough-kitchen", "video-02": "walkthrough-bedroom", "video-03": "walkthrough-home"}


def blur(img, boxes):
    for box in boxes:
        region = img.crop(box).filter(ImageFilter.GaussianBlur(14))
        img.paste(region, box)
    return img


def photos():
    os.makedirs(os.path.join(OUT, "work"), exist_ok=True)
    manifest = []
    for num, (slug, cat, title, boxes) in PHOTOS.items():
        src = glob.glob(os.path.join(IN, f"{num}-*.jpg"))
        assert len(src) == 1, (num, src)
        img = blur(ImageOps.exif_transpose(Image.open(src[0])).convert("RGB"), boxes)
        w, h = img.size
        for name, scale in (("s", 0.5), ("l", 1.0)):
            out = img if scale == 1 else img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
            out.save(os.path.join(OUT, "work", f"{slug}-{name}.webp"), "WEBP", quality=74, method=6)
        manifest.append({"slug": slug, "cat": cat, "title": title, "w": w, "h": h})
    with open(os.path.join(OUT, "work", "photos.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(len(manifest), "photos")


def logo():
    banner = Image.open(os.path.join(IN, "01-banner.jpg")).convert("RGB")
    for name, box in (("mark", (92, 52, 290, 232)), ("lockup", (92, 30, 965, 248))):
        img = banner.crop(box)
        img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
        # gold on black: brightness becomes opacity so it sits on any dark background
        alpha = img.convert("L").point(lambda v: 0 if v < 28 else min(255, int((v - 28) * 1.6)))
        img.putalpha(alpha)
        img.save(os.path.join(OUT, f"{name}.png"), optimize=True)
    banner.crop((92, 52, 290, 232)).resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "icon.png"))


def videos():
    os.makedirs(os.path.join(OUT, "video"), exist_ok=True)
    for raw, slug in VIDEOS.items():
        src = os.path.join(IN, f"{raw}.mov")
        out = os.path.join(OUT, "video", f"{slug}.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-an", "-map_metadata", "-1",
                        "-vf", "scale=540:-2,fps=30", "-c:v", "libx264", "-profile:v", "main", "-crf", "28",
                        "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "0.5", "-i", out, "-frames:v", "1",
                        "-c:v", "libwebp", "-quality", "70", os.path.join(OUT, "video", f"{slug}.webp")], check=True)
        print(slug, os.path.getsize(out) // 1024, "KB")


if __name__ == "__main__":
    which = sys.argv[1:] or ["photos", "logo", "videos"]
    for step in which:
        globals()[step]()
