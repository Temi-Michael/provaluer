import urllib.request
import json
import os

fonts = {
    "Inter": "inter",
    "Roboto": "roboto",
    "OpenSans": "open-sans",
    "Lato": "lato",
    "Montserrat": "montserrat",
    "PlayfairDisplay": "playfair-display",
    "Merriweather": "merriweather",
    "Poppins": "poppins"
}

os.makedirs("fonts", exist_ok=True)

for font_name, font_id in fonts.items():
    try:
        url = f"https://google-webfonts-helper.herokuapp.com/api/fonts/{font_id}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
            # Find regular and 700 (bold) variants
            regular_url = None
            bold_url = None
            for variant in data.get("variants", []):
                if variant["id"] == "regular" or variant["id"] == "400":
                    regular_url = variant["ttf"]
                if variant["id"] == "700":
                    bold_url = variant["ttf"]
            
            if regular_url:
                print(f"Downloading {font_name} Regular...")
                urllib.request.urlretrieve(regular_url, f"fonts/{font_name}-Regular.ttf")
            
            if bold_url:
                print(f"Downloading {font_name} Bold...")
                urllib.request.urlretrieve(bold_url, f"fonts/{font_name}-Bold.ttf")
    except Exception as e:
        print(f"Failed to fetch {font_name}: {e}")

