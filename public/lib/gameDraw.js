import { color } from "./lib/color.js";
import { config } from "./lib/config.js";
const gameDraw = {
    /** https://gist.github.com/jedfoster/7939513 **/
    decimal2hex: (d) => {
        return d.toString(16);
    }, // convert a decimal value to hex
    hex2decimal: (h) => {
        return parseInt(h, 16);
    }, // convert a hex value to decimal
    mixColors: (color_2, color_1, weight = 0.5) => {
        if (weight === 1) return color_1;
        if (weight === 0) return color_2;
        var col = "#";
        for (var i = 1; i <= 6; i += 2) {
            // loop through each of the 3 hex pairs—red, green, and blue, skip the '#'
            var v1 = hex2decimal(color_1.substr(i, 2)), // extract the current pairs
                v2 = hex2decimal(color_2.substr(i, 2)),
                // combine the current pairs from each source color, according to the specified weight
                val = decimal2hex(Math.floor(v2 + (v1 - v2) * weight));
            while (val.length < 2) {
                val = "0" + val;
            } // prepend a '0' if val results in a single digit
            col += val; // concatenate val to our new color string
        }
        return col; // PROFIT!
    },
    hslToRgb: (h, s, l) => {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hueToRgb(p, q, h + 1/3);
            g = hueToRgb(p, q, h);
            b = hueToRgb(p, q, h - 1/3);
        }
        return '#' +
            Math.round(r * 255).toString(16).padStart(2, '0') +
            Math.round(g * 255).toString(16).padStart(2, '0') +
            Math.round(b * 255).toString(16).padStart(2, '0');
    },
    rgbToHsl: (rgb) => {
        let r, g, b, h, s, l;

        r = parseInt(rgb.substring(1, 3), 16) / 255;
        g = parseInt(rgb.substring(3, 5), 16) / 255;
        b = parseInt(rgb.substring(5, 7), 16) / 255;

        let cmax = Math.max(r, g, b);
        let cmin = Math.min(r, g, b);
        let deltaC = cmax - cmin;

        // Hue
        switch (true){
            case deltaC == 0:
                h = 0;
                break;
            case cmax == r:
                h = 1/6 * (((g - b) / deltaC) % 6);
                break;
            case cmax == g:
                h = 1/6 * ((b - r) / deltaC + 2);
                break;
            case cmax == b:
                h = 1/6 * ((r - g) / deltaC + 4);
                break;
        }
        // Brightness
        l = (cmax + cmin) / 2
        // Saturation
        if (deltaC == 0)
            s = 0;
        else 
            s = deltaC / (1 - Math.abs(2 * l - 1));

        return [h, s, l];
    },
    hueToRgb: (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 0.166) return p + (q - p) * 6 * t;
        if (t < 0.5  ) return q;
        if (t < 0.666) return p + (q - p) * (2/3 - t) * 6;
        return p;
    },
    clamp: (n, lower, upper) => {
        return Math.min(upper, Math.max(lower, n));
    },
    //TODO: somehow move the calculation to these in reanimateColors to improve performance
    colorCache: {},
    modifyColor: (color, base = "16 0 1 0 false") => {
        // Edge cases because spaghetti
        if (typeof color == 'number') {
            color = color + " 0 1 0 false";
        }
        if (typeof base == 'number') {
            base = base + " 0 1 0 false";
        }
        // Split into array
        let colorDetails = color.split(" "),
            baseDetails = base.split(" ");

        // Color mirroring
        if (colorDetails[0] == "-1") {
            colorDetails[0] = baseDetails[0];
        }
        if (colorDetails[0] == "-1") {
            colorDetails[0] = gui.color;
        }

        let colorId = "";
        for (let i in colorDetails) {
            colorId += colorDetails[i] + " ";
        }

        // Exit if calculated already
        let cachedColor = colorCache[colorId];
        if (cachedColor != undefined) return cachedColor;

        // Get HSL values
        let baseColor = colorDetails[0];
        // check if color.base is not a word.
        if (!isNaN(baseColor)) {
            baseColor = parseInt(baseColor);
        }
        baseColor = rgbToHsl(getColor(baseColor) ?? baseColor);
        
        // Get color config
        let hueShift = parseFloat(colorDetails[1]) / 360,
            saturationShift = parseFloat(colorDetails[2]),
            brightnessShift = parseFloat(colorDetails[3]) / 100,
            allowBrightnessInvert = colorDetails[4] == 'true';

        // Apply config
        let finalHue = (baseColor[0] + hueShift) % 1,
            finalSaturation = clamp(baseColor[1] * saturationShift, 0, 1),
            finalBrightness = baseColor[2] + brightnessShift;

        if (allowBrightnessInvert && (finalBrightness > 1 || finalBrightness < 0)) {
            finalBrightness -= brightnessShift * 2;
        }
        finalBrightness = clamp(finalBrightness, 0, 1);

        // Gaming.
        let finalColor = hslToRgb(finalHue, finalSaturation, finalBrightness);
        if (!animatedColors[colorDetails[0]]) colorCache[colorId] = finalColor
        return finalColor;
    },
    getRainbow: (a, b, c = 0.5) => {
        if (0 >= c) return a;
        if (1 <= c) return b;
        let f = 1 - c;
        a = parseInt(a.slice(1, 7), 16);
        b = parseInt(b.slice(1, 7), 16);
        return (
            "#" +
            (
                (((a & 0xff0000) * f + (b & 0xff0000) * c) & 0xff0000) |
                (((a & 0x00ff00) * f + (b & 0x00ff00) * c) & 0x00ff00) |
                (((a & 0x0000ff) * f + (b & 0x0000ff) * c) & 0x0000ff)
            )
                .toString(16)
                .padStart(6, "0")
        );
    },
    animatedColor: {
        lesbian: "",
        gay: "",
        bi: "",
        trans: "",
        blue_red: "",
        blue_grey: "",
        grey_blue: "",
        red_grey: "",
        grey_red: ""
    },
    reanimateColors: () => {
        let now = Date.now(),

            //six_gradient = Math.floor((now / 200) % 6),
            five_bars = Math.floor((now % 2000) / 400),
            three_bars = Math.floor((now % 2000) * 3 / 2000),
            blinker = 150 > now % 300,

            lesbian_magenta  = "#a50062",
            lesbian_oredange = "#d62900",
            lesbian_white    = "#ffffff",
            lesbian_useSecondSet = five_bars < 2,

            gay_transition = (now / 2000) % 1,

            bi_pink   = "#D70071",
            bi_purple = "#9C4E97",
            bi_blue   = "#0035AA",

            trans_pink  = "#f7a8b8",
            trans_blue  = "#55cdfc",
            trans_white = "#ffffff";

        animatedColor.lesbian = getRainbow(lesbian_useSecondSet ? lesbian_oredange : lesbian_white, lesbian_useSecondSet ? lesbian_white : lesbian_magenta, (lesbian_useSecondSet ? five_bars : five_bars - 3) / 2);
        animatedColor.gay = hslToRgb(gay_transition, 0.75, 0.5);
        animatedColor.bi = [bi_pink, bi_purple, bi_blue][three_bars];
        animatedColor.trans = [trans_blue, trans_pink, trans_white, trans_pink, trans_blue][five_bars];

        animatedColor.blue_red = blinker ? color.blue : color.red;
        animatedColor.blue_grey = blinker ? color.blue : color.grey;
        animatedColor.grey_blue = blinker ? color.grey : color.blue;
        animatedColor.red_grey = blinker ? color.red : color.grey;
        animatedColor.grey_red = blinker ? color.grey : color.red;
    },
    animatedColors: {
        // police
        20: true,
        animatedBlueRed: true,

        21: true,
        animatedBlueGrey: true,
        animatedBlueGray: true,

        22: true,
        animatedGreyBlue: true,
        animatedGrayBlue: true,

        23: true,
        animatedRedGrey: true,
        animatedRedGray: true,

        24: true,
        animatedGreyRed: true,
        animatedGrayRed: true,

        // lesbian
        29: true,
        animatedLesbian: true,

        // rainbow
        36: true,
        rainbow: true,

        // trans
        37: true,
        animatedTrans: true,

        // bi
        38: true,
        animatedBi: true,
    },
    getColor: (colorNumber) => {
        switch (colorNumber) {
            case 0:
            case "teal":
            case "aqua":
                return color.teal;
            case 1:
            case "lightGreen":
                return color.lgreen;
            case 2:
            case "orange":
                return color.orange;
            case 3:
            case "yellow":
                return color.yellow;
            case 4:
            case "lavender":
                return color.lavender;
            case 5:
            case "pink":
                return color.pink;
            case 6:
            case "veryLightGrey":
            case "veryLightGray":
                return color.vlgrey;
            case 7:
            case "lightGrey":
            case "lightGray":
                return color.lgrey;
            case 8:
            case "pureWhite":
                return color.guiwhite;
            case 9:
            case "black":
                return color.black;
            case 10:
            case "blue":
                return color.blue;
            case 11:
            case "green":
                return color.green;
            case 12:
            case "red":
                return color.red;
            case 13:
            case "gold":
                return color.gold;
            case 14:
            case "purple":
                return color.purple;
            case 15:
            case "magenta":
                return color.magenta;
            case 16:
            case "grey":
            case "gray":
                return color.grey;
            case 17:
            case "darkGrey":
            case "darkGray":
                return color.dgrey;
            case 18:
            case "white":
                return color.white;
            case 19:
            case "pureBlack":
                return color.guiblack;
            case 20:
            case "animatedBlueRed":
                return animatedColor.blue_red;
            case 21:
            case "animatedBlueGrey":
            case "animatedBlueGray":
                return animatedColor.blue_grey;
            case 22:
            case "animatedGreyBlue":
            case "animatedGrayBlue":
                return animatedColor.grey_blue;
            case 23:
            case "animatedRedGrey":
            case "animatedRedGray":
                return animatedColor.red_grey;
            case 24:
            case "animatedGreyRed":
            case "animatedGrayRed":
                return animatedColor.grey_red;
            case 25:
            case "mustard":
                return "#C49608";
            case 26:
            case "darkOrange":
                return "#EC7B0F";
            case 27:
            case "brown":
                return "#895918";
            case 28:
            case "cyan":
            case "turquoise":
                return "#13808E";
            case 29:
            case "animatedLesbian":
                return animatedColor.lesbian;
            case 30:
            case "powerGem":
            case "powerStone":
                return "#a913cf";
            case 31:
            case "spaceGem":
            case "spaceStone":
                return "#226ef6";
            case 32:
            case "realityGem":
            case "realityStone":
                return "#ff1000";
            case 33:
            case "soulGem":
            case "soulStone":
                return "#ff9000";
            case 34:
            case "timeGem":
            case "timeStone":
                return "#00e00b";
            case 35:
            case "mindGem":
            case "mindStone":
                return "#ffd300";
            case 36:
            case "rainbow":
                return animatedColor.gay;
            case 37:
            case "animatedTrans":
                return animatedColor.trans;
            case 38:
            case "animatedBi":
                return animatedColor.bi;
            case 39:
            case "pumpkinStem":
                return "#654321";
            case 40:
            case "pumpkinBody":
                return "#e58100";
            case 41:
            case "tree":
                return "#267524";
        }
    },
    getColorDark: (givenColor) => {
        let dark = config.graphical.neon ? color.white : color.black;
        if (config.graphical.darkBorders) return dark;
        return mixColors(givenColor, dark, color.border);
    },
    getZoneColor: (cell, real) => {
        switch (cell) {
            case "bas1":
            case "bap1":
            case "dom1":
                return color.blue;
            case "bas2":
            case "bap2":
            case "dom2":
                return color.green;
            case "bas3":
            case "bap3":
            case "dom3":
            case "boss":
                return color.red;
            case "bas4":
            case "bap4":
            case "dom4":
                return color.magenta;
            case "bas5":
            case "bap5":
            case "dom5":
                return "#C49608";
            case "bas6":
            case "bap6":
            case "dom6":
                return "#EC7B0F";
            case "bas7":
            case "bap7":
            case "dom7":
                return "#895918";
            case "bas8":
            case "bap8":
            case "dom8":
                return "#13808E";
            case "port":
                return color.guiblack;
            case "nest":
                return real ? color.purple : color.lavender;
            case "dom0":
                return color.gold;
            default:
                return real ? color.white : color.lgrey;
        }
    },
    setColor: (context, givenColor) => {
        if (config.graphical.neon) {
            context.fillStyle = getColorDark(givenColor);
            context.strokeStyle = givenColor;
        } else {
            context.fillStyle = givenColor;
            context.strokeStyle = getColorDark(givenColor);
        }
    }
}
export { gameDraw }