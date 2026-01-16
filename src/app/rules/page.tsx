import Link from 'next/link';
import { Flame } from 'lucide-react';

export default function RulesPage() {
    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <Link href="/" className="btn btn-secondary" style={{ marginBottom: 'var(--spacing-6)' }}>
                &larr; Zurück
            </Link>

            <header style={{ marginBottom: 'var(--spacing-8)' }}>
                <h1 className="title-display" style={{ fontSize: '2.5rem' }}>Offizielles Regelwerk</h1>
                <p className="subtitle">Because we love Beer Pong.</p>
            </header>

            <div className="glass-panel" style={{ padding: 'var(--spacing-8)' }}>
                <section style={{ marginBottom: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>General Gameplay</h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        Beer Pong wird generell in Teams von zwei Spielern gespielt, bei denen jedes Team abwechselnd einen Ping-Pong-Ball in die Becher des gegnerischen Teams wirft.
                        Sobald ein Ball in einem Becher landet, wird dieser weggenommen und der Gegner trinkt den Inhalt.
                        Wenn beide Teammitglieder treffen, bekommen sie die Bälle zurück und dürfen erneut werfen.
                        Das Team, das erfolgreich alle gegnerischen Becher trifft, gewinnt das Spiel.
                        Da es viele Variationen gibt, ist es gut, Dinge wie Re-racks und Bouncing/Swatting vor dem Spiel zu klären.
                        Der Gewinner bleibt typischerweise am Tisch und erwartet den nächsten Herausforderer.
                    </p>
                </section>

                <section style={{ marginBottom: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>Wer fängt an? (Eyes)</h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        Im ersten Spiel des Abends wird der erste Wurf durch "Eyes" entschieden.
                        Dabei wirft ein Spieler jedes Teams den Ball, während er Augenkontakt mit dem Gegner hält.
                        Wenn beide verfehlen oder treffen, werfen die Partner. Das geht so lange, bis einer trifft und der andere nicht.
                        Der getroffene Becher wird nicht entfernt; der Ball wird herausgenommen und an das Team zurückgegeben, das getroffen hat.
                        Wenn es nicht das erste Spiel ist, fängt der Gewinner des vorherigen Spiels an.
                    </p>
                </section>

                <section style={{ marginBottom: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>Elbow / Wrists Rule</h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        Oft eine ungeschriebene Regel: Beim Werfen müssen die Ellbogen hinter der Tischkante bleiben.
                        Bei der "Wrist"-Regel müssen die Handgelenke hinter der Kante bleiben.
                        Ein Verstoß führt dazu, dass der Wurf nicht zählt. Wenn getroffen wurde, darf der Spieler einen Schritt zurücktreten und erneut werfen.
                        Dies ist oft die am meisten diskutierte Regel.
                    </p>
                </section>

                <section style={{ marginBottom: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>Re-Racking</h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        Zweimal pro Spiel kann jedes Team verlangen, dass die Becher zu Beginn ihres Zuges neu angeordnet werden.
                        Dies ist bekannt als Re-racking. Ein Rack darf bei 6, 4, 3 oder 2 verbleibenden Bechern stattfinden.
                        Wenn man Bälle zurückbekommt, gilt dies immer noch als derselbe Zug und man darf nicht re-racken.
                        Der letzte Becher darf immer zentriert werden.
                    </p>
                </section>

                <section style={{ marginBottom: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>Bouncing / Swatting</h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        Wenn ein Ball den Tisch berührt und dann in einen Becher geht (Aufsetzer), wird der getroffene Becher sowie ein weiterer vom verteidigenden Team gewählter Becher entfernt.
                        Aufsetzer dürfen weggeschlagen (swatted) werden.
                        Bei nur 2 verbleibenden Bechern zählt der Aufsetzer nur als ein Becher.
                    </p>
                </section>

                <section style={{ marginBottom: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>Fingering / Blowing</h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        "Fingering" ist, wenn der Ball im Becher rotiert und die Verteidigung ihn mit dem Finger herauszieht.
                        "Blowing" ist, wenn er herausgepustet wird.
                        Wenn nicht anders vereinbart, zählen diese Aktionen nicht!
                    </p>
                </section>

                <section style={{ marginBottom: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>Bitch Cup / Death Cup</h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        Sobald ein Becher getroffen wurde und bevor der Inhalt getrunken wurde: Wenn dieser Becher (auch in der Hand) erneut getroffen wird, ist das Spiel sofort vorbei ("Death Cup").
                    </p>
                </section>

                <section style={{ marginBottom: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>On Fire <Flame size={24} color="#FF6B6B" /></h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        Wenn ein Spieler zwei Becher in Folge trifft, kann er "Heating Up" rufen.
                        Trifft er den dritten, ist er "On Fire" und darf werfen, bis er verfehlt.
                        Dies muss angesagt werden!
                    </p>
                </section>

                <section style={{ marginBottom: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>Island / Solo / Iso</h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        Einmal pro Spiel kann jeder Spieler einen spezifischen, einzeln stehenden Becher ansagen.
                        Wird dieser getroffen, zählt er doppelt (2 Becher). Wird ein anderer getroffen, zählt er nicht.
                    </p>
                </section>

                <section style={{ marginBottom: 'var(--spacing-8)' }}>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>Rebuttal (Konter)</h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        Nachdem der letzte Becher getroffen wurde, hat das verlierende Team eine Chance, die verbleibenden Becher zu treffen.
                        Jeder Spieler wirft, bis er verfehlt. Schaffen sie es, alle Becher zu treffen, geht das Spiel in eine 3-Becher-Verlängerung (Overtime).
                    </p>
                </section>

                <section>
                    <h2 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>Overtime</h2>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-dim)' }}>
                        Drei Becher werden im Dreieck aufgestellt. Das Team, das eigentlich gewonnen hätte, beginnt. Keine Re-racks erlaubt.
                    </p>
                </section>
            </div>
        </div>
    );
}
