// Letzte Ergebnisse als Kästchen; Buchstabe statt nur Farbe, damit es ohne Farbsehen lesbar bleibt
export default function FormDots({ form, labels }: { form: ('W' | 'L')[]; labels: { win: string; loss: string; winShort: string; lossShort: string } }) {
    if (form.length === 0) return <span style={{ color: 'var(--color-text-dim)' }}>–</span>;
    return (
        <span className="form-dots" role="img" aria-label={form.map(r => (r === 'W' ? labels.win : labels.loss)).join(', ')}>
            {form.map((r, i) => (
                <span key={i} className={`form-dot ${r === 'W' ? 'form-dot-win' : 'form-dot-loss'}`} aria-hidden="true">
                    {r === 'W' ? labels.winShort : labels.lossShort}
                </span>
            ))}
        </span>
    );
}
