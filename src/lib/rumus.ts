import katex from "katex";

/**
 * Question text stores formulas inline as LaTeX between dollar signs ("luas $\pi r^2$"), so the
 * columns stay plain text and old questions need no migration. "\$" is a literal dollar sign.
 */
export type Potongan = { rumus: boolean; isi: string; mulai: number; akhir: number };

export function pecahRumus(teks: string): Potongan[] {
  const hasil: Potongan[] = [];
  let biasa = "";
  let mulaiBiasa = 0;
  let i = 0;
  const tutup = (sampai: number) => {
    if (biasa) hasil.push({ rumus: false, isi: biasa, mulai: mulaiBiasa, akhir: sampai });
    biasa = "";
  };
  while (i < teks.length) {
    if (teks[i] === "\\" && teks[i + 1] === "$") {
      biasa += "$";
      i += 2;
      continue;
    }
    if (teks[i] === "$") {
      let j = i + 1;
      while (j < teks.length && !(teks[j] === "$" && teks[j - 1] !== "\\")) j++;
      const isi = teks.slice(i + 1, j);
      if (j < teks.length && isi.trim()) {
        tutup(i);
        hasil.push({ rumus: true, isi, mulai: i, akhir: j + 1 });
        i = j + 1;
        mulaiBiasa = i;
        continue;
      }
    }
    if (!biasa) mulaiBiasa = i;
    biasa += teks[i];
    i++;
  }
  tutup(teks.length);
  return hasil;
}

export const adaRumus = (teks: string) => pecahRumus(teks).some((p) => p.rumus);

/** KaTeX escapes everything it renders and runs with trust off, so the HTML is safe to inject. */
export function rumusHtml(latex: string) {
  return katex.renderToString(latex, { throwOnError: false, output: "htmlAndMathml", strict: false });
}
