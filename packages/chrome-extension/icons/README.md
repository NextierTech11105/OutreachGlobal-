# Nextier Phone Center Icons

Create the following icon files for the Chrome extension:

## Required Icons

1. **icon16.png** - 16x16 pixels (toolbar icon)
2. **icon48.png** - 48x48 pixels (extensions page)  
3. **icon128.png** - 128x128 pixels (Chrome Web Store)

## Suggested Design

- Blue/purple gradient background (matching Nextier branding)
- White phone icon in center
- Rounded corners

## Quick Create with ImageMagick

```bash
# Create a simple blue circle with phone emoji
convert -size 128x128 xc:transparent \
  -fill "linear-gradient:blue-purple" \
  -draw "circle 64,64 64,0" \
  icon128.png

# Resize for other sizes
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

## Or Use Online Tools

1. Go to https://favicon.io/
2. Use emoji picker, select 📞
3. Download and rename files

## Placeholder

For now, the extension will work without icons (Chrome uses a default puzzle piece).
