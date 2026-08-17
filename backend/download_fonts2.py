import urllib.request
import re
import os

fonts = {
    "Inter": "Inter",
    "Roboto": "Roboto",
    "OpenSans": "Open+Sans",
    "Lato": "Lato",
    "Montserrat": "Montserrat",
    "PlayfairDisplay": "Playfair+Display",
    "Merriweather": "Merriweather",
    "Poppins": "Poppins"
}

os.makedirs("fonts", exist_ok=True)

for name, query in fonts.items():
    try:
        url = f"https://fonts.googleapis.com/css2?family={query}:wght@400;700&display=swap"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req) as response:
            css = response.read().decode()
            
            # Find all URLs
            urls = re.findall(r"url\((https://fonts.gstatic.com/s/[^)]+\.woff2)\)", css)
            
            if urls:
                # WOFF2 to TTF conversion is hard in python without libraries.
                # Let's change the User-Agent to an old browser so Google Fonts serves TTF instead of WOFF2.
                pass
    except Exception as e:
        print(f"Failed CSS fetch for {name}: {e}")

for name, query in fonts.items():
    try:
        url = f"https://fonts.googleapis.com/css?family={query}:400,700"
        # User-Agent for IE 8 to get TTF
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0)'})
        with urllib.request.urlopen(req) as response:
            css = response.read().decode()
            
            # Find URLs
            regular_urls = re.findall(r"font-weight:\s*400.*?url\((https://[^)]+\.ttf)\)", css, re.DOTALL)
            bold_urls = re.findall(r"font-weight:\s*700.*?url\((https://[^)]+\.ttf)\)", css, re.DOTALL)
            
            if regular_urls:
                print(f"Downloading {name} Regular...")
                urllib.request.urlretrieve(regular_urls[0], f"fonts/{name}-Regular.ttf")
            
            if bold_urls:
                print(f"Downloading {name} Bold...")
                urllib.request.urlretrieve(bold_urls[0], f"fonts/{name}-Bold.ttf")
    except Exception as e:
        print(f"Failed TTF fetch for {name}: {e}")

