// ─────────────────────────────────────────────────────────────────────────────
// content.js — edit this file to change all text on the dimensions page.
//
// HTML tags are allowed in any field.
// Simple mode text should be 1–2 punchy sentences.
// Detail mode text can be longer and include math/jargon.
// ─────────────────────────────────────────────────────────────────────────────

window.DIM_CONTENT = {

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    siteLabel: 'Interactive Geometry · physics.connermccarthy.com',
    title: 'The Dimension Tradeoff',

    simple: `Math allows spaces with any number of dimensions — and shapes in
      high-dimensional space behave nothing like the ones you're used to.
      That's a <strong>curse for search algorithms</strong> and a
      <strong>blessing for AI</strong>. Each section below shows you exactly why.`,

    detail: `As the number of dimensions grows, geometric intuition built in a 2D/3D
      world stops working — volume, distance, and direction all behave in specific,
      measurable ways that have nothing to do with how things "look." That breakdown
      is <strong>both a curse and a blessing</strong>: it's why searching for nearest
      neighbors gets hopeless in high dimensions, and it's also exactly why AI models
      can pack thousands of independent features into a single embedding vector.`,
  },

  // ── Sections ─────────────────────────────────────────────────────────────────
  sections: {

    // ── 02: Shell paradox ──────────────────────────────────────────────────────
    shell: {
      tag:     'Section 02 — Volume concentration',
      heading: 'Almost all the volume lives in a thin shell',

      simple: `Peel a thin layer off an orange and most of the fruit is still inside.
        Do the same to a shape with 100 dimensions and
        <strong>almost the entire thing disappears</strong> — all the volume is in
        that thin outer skin.`,

      detail: `Take a ball in <em>d</em> dimensions and shave off its outer 10% of
        radius. In 2D or 3D, that's a thin sliver — most of the volume is still in
        the middle. But as <em>d</em> grows, the fraction of volume left in that
        "safe" interior collapses toward zero: nearly <strong>all</strong> the volume
        of a high-dimensional ball lives in a thin shell near its surface.`,

      caption: `Metaphor note: the white outline and the orange ring are drawn at a
        fixed position set only by the shell-thickness slider. The pulsing
        <strong style="color:var(--blue)">blue core</strong> is the one number that's
        real — its area is scaled to match the actual d‑dimensional volume fraction,
        and it collapses far faster than the picture's fixed ring suggests.`,
    },

    // ── 03: Word vectors ───────────────────────────────────────────────────────
    wordvec: {
      tag:     'Section 03 — How AI Uses Language',
      heading: 'king − man + woman ≈ queen',

      simple: `AI turns words into lists of numbers so it can do math with meaning.
        <strong>king − man + woman ≈ queen</strong> — not because anyone programmed
        that rule, but because the model discovered "royal" and "gender" are separate
        directions it can combine.`,

      detail: `If a model's embedding space has learned a consistent "gender" direction,
        you can do <em>arithmetic</em> on words: take the vector for <strong>king</strong>,
        subtract <strong>man</strong>, add <strong>woman</strong>, and you land near
        <strong>queen</strong> — not because anyone told it to, but because that
        direction shows up consistently across many word pairs. Real models need hundreds
        or thousands of dimensions precisely so that <em>many</em> such directions
        (gender, tense, plurality, sentiment…) can coexist without crowding each other
        out — more on why that's possible in Section 07.`,

      caption: `Metaphor note: real word embeddings live in 300–4096 dimensions and
        can't be drawn directly. These are <strong>4 hand-placed toy coordinates</strong>
        in a 2D slice, chosen to illustrate the idea — but the cosine similarity and
        residual below are computed for real from whatever coordinates are plotted,
        exactly the way it would work in the real embedding space.`,
    },

    // ── 04: Equatorial collapse ────────────────────────────────────────────────
    equator: {
      tag:     'Section 04 — Surface area flattening',
      heading: 'High-dimensional spheres are basically pancakes',

      simple: `On a normal ball, surface area is spread evenly from pole to pole.
        On a high-dimensional ball, <strong>almost all of it is jammed near the
        equator</strong> — peel away everything more than a few degrees from the belt
        and you've lost almost nothing.`,

      detail: `Pick any "equator" — any great circle — on a sphere in <em>d</em>
        dimensions, and ask what fraction of the surface lies within a few degrees of
        it. In 2D or 3D, not much: most of the surface is spread across other
        latitudes. But as <em>d</em> grows, the surface area collapses toward that one
        equatorial band — <strong>almost the entire sphere becomes a thin slice</strong>
        around whatever equator you chose, no matter which one.`,

      caption: `Metaphor note: the ellipse's squashing is a stylized visual effect tied
        to the dimension slider — it isn't the literal computed number. The
        <strong style="color:var(--orange)">real fraction</strong> (below) climbs
        toward 100% far faster than the picture suggests: almost the entire surface
        concentrates near <em>any</em> equator you pick.`,
    },

    // ── 05: Nearest-neighbor / soccer ─────────────────────────────────────────
    nn: {
      tag:     'Section 05 — Finding open players',
      heading: 'Who do I pass to? Everyone feels the same distance away',

      simple: `You're on the ball in soccer. You want to find the nearest open
        teammate. Easy in real life. In 100 dimensions, <strong>every player on the
        field is roughly the same distance from you.</strong> Shortest pass and
        longest pass are nearly identical. There's no "nearby" anymore. The edges dominate.`,

      detail: `Imagine you hold the ball on a <em>d</em>-dimensional soccer field.
        Scatter 20 teammates randomly and measure the distance to the nearest vs.
        farthest. In 2D or 3D the ratio (nearest ÷ farthest) is small — some players
        are clearly closer. As <em>d</em> grows the ratio climbs toward 1: all
        players become roughly equidistant. This is the <strong>curse of
        dimensionality for search</strong> — nearest-neighbor lookup loses meaning
        when every candidate is equally "close."`,

      caption: `The 2D field uses stylized directions, but each player's distance
        from you is scaled from the real d-dimensional distance. As d rises, the dots
        collapse toward the same ring because nearest and farthest are becoming
        nearly equal.`,
    },

    // ── 06: Volume-overlap / darts ────────────────────────────────────────────
    overlap: {
      tag:     'Section 06 — Darts probability',
      heading: 'Throw blindfolded — you\'ll almost never hit the bullseye',

      simple: `A dartboard's bullseye is small, but you can still hit the board most
        throws. Now imagine a 100-dimensional dartboard where the target zone fills the
        whole wall — yet a random throw <strong>almost never lands inside it</strong>.
        High-dimensional space is that empty.`,

      detail: `A ball inscribed in a box covers π/4 ≈ 78.5% of the area in 2D
        (circle in a square). As dimensions grow, the ball still touches every wall,
        yet its share of the box's volume <strong>collapses toward zero</strong> —
        a random dart almost never scores, no matter how generous the target looks on
        screen. The exact probability uses the real d-dimensional ball-volume formula
        V<sub>d</sub>(r) = π<sup>d/2</sup> r<sup>d</sup> / Γ(d/2 + 1).`,

      caption: `The dartboard rings are drawn at fixed proportions of the slider
        radius — they don't change with dimension. The colored darts are real
        d-dimensional random throws; only their first two coordinates are plotted.
        Watch how scoring becomes vanishingly rare as d climbs.`,
    },

    // ── 07: Orthogonality payoff ───────────────────────────────────────────────
    // ── 08: Summary table ─────────────────────────────────────────────────────
    summary: {
      tag:     'Section 08 — Summary',
      heading: 'The tradeoff, side by side',
    },

  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: `All visualizations are 2D/3D stylized metaphors; the numbers shown are
    computed using the real mathematics of n‑dimensional geometry.`,

};
