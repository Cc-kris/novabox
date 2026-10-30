from PIL import Image, ImageDraw, ImageFilter
import numpy as np, math, os

S = 4096
out = 1024
scale = S / 1024.0
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([62*scale, 62*scale, 962*scale, 962*scale], radius=206*scale, fill=255)

# Deep green diagonal gradient
y, x = np.mgrid[0:S, 0:S]
u = (x / S * 0.62 + (1 - y / S) * 0.38)
u = np.clip(u, 0, 1)
c0 = np.array([7, 46, 37], float)
c1 = np.array([11, 126, 92], float)
c2 = np.array([40, 200, 151], float)
t = u[..., None]
grad = np.where(t < 0.62, c0 + (c1 - c0) * (t / 0.62), c1 + (c2 - c1) * ((t - 0.62) / 0.38))
base = Image.fromarray(np.dstack([grad, np.full((S, S), 255)]).astype('uint8'), 'RGBA')
img.paste(base, (0, 0), mask)

d = ImageDraw.Draw(img, 'RGBA')
# Soft top-left light
light = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ld = ImageDraw.Draw(light)
for r in range(950, 0, -12):
    a = int(28 * (1 - r / 950) ** 2)
    ld.ellipse([(360-r)*scale, (230-r)*scale, (360+r)*scale, (230+r)*scale], fill=(210, 255, 236, a))
img.alpha_composite(light)

# Faint technical grid, adds texture without a flat background
grid = Image.new('RGBA', (S, S), (0, 0, 0, 0))
gd = ImageDraw.Draw(grid)
step = 64 * scale
for i in range(-S, 2*S, int(step)):
    gd.line([(i, 0), (i + S, S)], fill=(180, 255, 226, 10), width=max(1, int(1.2*scale)))
for i in range(-S, 2*S, int(step)):
    gd.line([(i, 0), (i - S, S)], fill=(180, 255, 226, 8), width=max(1, int(1.2*scale)))
grid.putalpha(Image.composite(grid.getchannel('A'), Image.new('L', (S,S), 0), mask))
img.alpha_composite(grid)

# Bottom vignette for depth
vig = Image.new('RGBA', (S, S), (0, 0, 0, 0))
vd = ImageDraw.Draw(vig)
for i in range(60):
    a = int(2 + i * 1.4)
    vd.ellipse([(-300+i*6)*scale, (720+i*5)*scale, (1330-i*6)*scale, (1320-i*5)*scale], outline=(0, 24, 18, a), width=int(30*scale))
img.alpha_composite(vig)

# Cube shadow
shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.ellipse([(250)*scale, (700)*scale, (775)*scale, (885)*scale], fill=(0, 25, 17, 120))
shadow = shadow.filter(ImageFilter.GaussianBlur(34*scale))
img.alpha_composite(shadow)

# Cube faces (isometric)
top = [(512, 292), (760, 423), (512, 554), (264, 423)]
left = [(264, 423), (512, 554), (512, 790), (264, 659)]
right = [(512, 554), (760, 423), (760, 659), (512, 790)]
top = [(int(px*scale), int(py*scale)) for px, py in top]
left = [(int(px*scale), int(py*scale)) for px, py in left]
right = [(int(px*scale), int(py*scale)) for px, py in right]

# Glow under cube edges
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
gdr = ImageDraw.Draw(glow)
for poly, col, w in [(top, (140, 255, 220, 120), 18), (left, (80, 235, 186, 100), 14), (right, (80, 235, 186, 100), 14)]:
    gdr.line(poly + [poly[0]], fill=col, width=int(w*scale), joint='curve')
glow = glow.filter(ImageFilter.GaussianBlur(16*scale))
img.alpha_composite(glow)

def poly_gradient(poly, c0, c1, vertical=True):
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w, h = max(1, x1-x0), max(1, y1-y0)
    layer = Image.new('RGBA', (w, h), (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    n = 360
    for i in range(n):
        f = i / (n - 1)
        col = tuple(int(c0[k] + (c1[k]-c0[k])*f) for k in range(3)) + (255,)
        if vertical:
            ld.rectangle([0, int(f*h), w, int((f+1/n)*h)+1], fill=col)
        else:
            ld.rectangle([int(f*w), 0, int((f+1/n)*w)+1, h], fill=col)
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).polygon([(p[0]-x0, p[1]-y0) for p in poly], fill=255)
    img.paste(layer, (x0, y0), m)

poly_gradient(top, (238, 255, 248), (150, 244, 216), vertical=False)
poly_gradient(left, (24, 146, 111), (10, 92, 72))
poly_gradient(right, (74, 220, 179), (32, 170, 132))

# Interior cut: a small dark inset "box opening" on top
inset = [(512, 360), (650, 431), (512, 502), (374, 431)]
inset = [(int(px*scale), int(py*scale)) for px, py in inset]
d.polygon(inset, fill=(7, 64, 51, 235))
d.line(inset + [inset[0]], fill=(190, 255, 235, 170), width=int(4*scale), joint='curve')

# Edge highlights
for poly, w, a in [(top, 6, 220), (left, 4, 85), (right, 4, 110)]:
    d.line(poly + [poly[0]], fill=(230, 255, 247, a), width=int(w*scale), joint='curve')

# Coral spark accent
cx, cy, R = 741*scale, 283*scale, 54*scale
spark = []
for i in range(16):
    ang = -math.pi/2 + i*math.pi/8
    r = R if i % 4 == 0 else (R*0.30 if i % 2 == 0 else R*0.12)
    spark.append((cx + math.cos(ang)*r, cy + math.sin(ang)*r))
glow2 = Image.new('RGBA', (S,S), (0,0,0,0))
ImageDraw.Draw(glow2).polygon(spark, fill=(255, 166, 110, 180))
glow2 = glow2.filter(ImageFilter.GaussianBlur(18*scale))
img.alpha_composite(glow2)
d.polygon(spark, fill=(255, 197, 150, 255))
d.ellipse([cx-7*scale, cy-7*scale, cx+7*scale, cy+7*scale], fill=(255, 249, 238, 255))

# Crisp inner rim
rim = Image.new('RGBA', (S,S), (0,0,0,0))
ImageDraw.Draw(rim).rounded_rectangle([70*scale,70*scale,954*scale,954*scale], radius=198*scale, outline=(180,255,231,85), width=int(3*scale))
img.alpha_composite(rim)

img.putalpha(Image.composite(img.getchannel('A'), Image.new('L', (S, S), 0), mask))
img = img.resize((out, out), Image.LANCZOS)
img.save('desktop/Resources/AppIcon-1024.png')
print('wrote', os.path.getsize('desktop/Resources/AppIcon-1024.png'))
