'use client';

import { createTournament } from '@/app/actions/tournaments';
import { useRouter } from 'next/navigation';
import { Player } from '@prisma/client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Users, User, Trophy, PartyPopper, Play, Calendar, Search, MapPin } from 'lucide-react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { calculateTournamentDuration, formatDuration, getEstimatedEndTime } from '@/lib/estimation';


export default function CreateTournamentForm({ players }: { players: Player[] }) {
    const router = useRouter();
    const [startImmediately, setStartImmediately] = useState(true);
    const [mode, setMode] = useState<'SOLO' | 'TEAM'>('SOLO');
    const [isRanked, setIsRanked] = useState(true);
    const [hasReturnLeg, setHasReturnLeg] = useState(false);
    const [type, setType] = useState('SINGLE_ELIMINATION');
    const [systemMatchDuration, setSystemMatchDuration] = useState(15);
    const [tableCount, setTableCount] = useState(1);
    const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 16));
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        // Fetch real duration stats on mount
        import('@/app/actions/admin').then(m => {
            m.getPublicGlobalDurationStats().then(stats => {
                if (stats.isCalculated) {
                    setSystemMatchDuration(stats.averageMinutes);
                }
            });
        });
    }, []);

    async function clientAction(formData: FormData) {
        // Add startImmediately to formData as it might be useful or just rely on state if we were using it differently
        // But here we use a checkbox in the form which is better for traditional formData
        const res = await createTournament(formData);
        if (res.success && res.redirectUrl) {
            router.push(res.redirectUrl); // Old behavior if BE sends redirect
        } else if (res.success && res.tournament) {
            // New behavior: Redirect to detailed page with success flag
            router.push(`/tournaments/${res.tournament.id}?newlyCreated=true`);
        } else {
            alert('Fehler: ' + res.error);
        }
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', maxWidth: '600px', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
            {/* Background decorative glow */}
            <div style={{
                position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px',
                background: 'radial-gradient(circle, rgba(217, 70, 239, 0.15) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none'
            }} />

            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'var(--surface-color)', boxShadow: 'var(--shadow-glow-primary)',
                    marginBottom: 'var(--spacing-4)', border: '1px solid var(--color-primary)'
                }}>
                    <Trophy size={32} color="var(--color-primary)" />
                </div>
                <h1 className="title-gradient" style={{ fontSize: '1.8rem', marginBottom: 'var(--spacing-2)' }}>Neues Turnier</h1>
                <p className="subtitle">Erstelle dein Bierpong-Event in Sekunden</p>
            </div>

            <form ref={formRef} action={clientAction} style={{ display: 'grid', gap: 'var(--spacing-6)' }}>

                {/* Name Input */}
                <div style={{ position: 'relative' }}>
                    <label style={{
                        position: 'absolute', left: '16px', top: '-10px', background: 'var(--color-surface)',
                        padding: '0 8px', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600,
                        borderRadius: '4px'
                    }}>
                        Turnier Name
                    </label>
                    <input
                        type="text"
                        name="name"
                        required
                        placeholder="z.B. Friday Night Pong"
                        style={{
                            width: '100%', padding: '16px', background: 'var(--color-surface)',
                            border: '1px solid var(--color-border-strong)', color: 'var(--color-text)',
                            borderRadius: 'var(--radius-lg)', fontSize: '1.1rem', fontWeight: 500
                        }}
                    />
                </div>

                {/* Location Picker */}
                <div>
                    <label style={{ marginBottom: 'var(--spacing-2)', fontWeight: '600', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={16} color="var(--color-secondary)" /> Location
                    </label>
                    <div style={{ width: '100%', boxSizing: 'border-box' }}>
                        <LocationPicker
                            defaultValue=""
                            onLocationSelect={(address, lat, lng) => {
                                const form = formRef.current;
                                if (form) {
                                    let locInput = form.querySelector('input[name="location"]') as HTMLInputElement;
                                    if (!locInput) {
                                        locInput = document.createElement('input');
                                        locInput.type = 'hidden';
                                        locInput.name = 'location';
                                        form.appendChild(locInput);
                                    }
                                    locInput.value = address;
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Timing Section - Card Style */}
                <div style={{ background: 'var(--color-surface-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-3)', fontWeight: '600', color: 'var(--color-text)' }}>Zeitplanung</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)', padding: '4px', background: 'var(--color-surface)', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                            padding: '10px', borderRadius: 'var(--radius-full)',
                            background: startImmediately ? 'var(--color-primary)' : 'transparent',
                            color: startImmediately ? 'white' : 'var(--color-text-dim)',
                            transition: 'all 0.3s ease',
                            fontWeight: 600
                        }}>
                            <input type="radio" name="startImmediately" value="on" checked={startImmediately} onChange={() => setStartImmediately(true)} style={{ display: 'none' }} />
                            <Play size={16} /> Jetzt
                        </label>
                        <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                            padding: '10px', borderRadius: 'var(--radius-full)',
                            background: !startImmediately ? 'var(--color-primary)' : 'transparent',
                            color: !startImmediately ? 'white' : 'var(--color-text-dim)',
                            transition: 'all 0.3s ease',
                            fontWeight: 600
                        }}>
                            <input type="radio" name="startImmediately" value="off" checked={!startImmediately} onChange={() => setStartImmediately(false)} style={{ display: 'none' }} />
                            <Calendar size={16} /> Später
                        </label>
                    </div>

                    {!startImmediately && (
                        <div className="animate-fadeIn" style={{ marginTop: 'var(--spacing-4)' }}>
                            <input
                                type="datetime-local"
                                name="date"
                                required={!startImmediately}
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                        </div>
                    )}
                </div>

                {/* Mode Selection Grid */}
                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: '600', color: 'var(--color-text)' }}>Spielmodus</label>
                    <input type="hidden" name="mode" value={mode} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                        <button type="button" onClick={() => setMode('SOLO')}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: 'var(--spacing-4)',
                                background: mode === 'SOLO' ? 'rgba(217, 70, 239, 0.1)' : 'var(--color-surface)',
                                border: mode === 'SOLO' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative'
                            }}>
                            {mode === 'SOLO' && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />}
                            <User size={28} color={mode === 'SOLO' ? 'var(--color-primary)' : 'var(--color-text-dim)'} />
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ display: 'block', fontWeight: 'bold', color: mode === 'SOLO' ? 'var(--color-primary)' : 'var(--color-text)' }}>1 vs 1</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Einzelspieler</span>
                            </div>
                        </button>
                        <button type="button" onClick={() => setMode('TEAM')}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: 'var(--spacing-4)',
                                background: mode === 'TEAM' ? 'rgba(6, 182, 212, 0.1)' : 'var(--color-surface)',
                                border: mode === 'TEAM' ? '2px solid var(--color-secondary)' : '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative'
                            }}>
                            {mode === 'TEAM' && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-secondary)' }} />}
                            <Users size={28} color={mode === 'TEAM' ? 'var(--color-secondary)' : 'var(--color-text-dim)'} />
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ display: 'block', fontWeight: 'bold', color: mode === 'TEAM' ? 'var(--color-secondary)' : 'var(--color-text)' }}>2 vs 2</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Team-Match</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Ranking Toggle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                    <input type="hidden" name="isRanked" value={isRanked ? 'true' : 'false'} />
                    <button type="button" onClick={() => setIsRanked(true)}
                        style={{
                            padding: '12px', borderRadius: 'var(--radius-lg)',
                            border: isRanked ? '2px solid #fbbf24' : '1px solid var(--color-border)',
                            background: isRanked ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                            color: isRanked ? '#d97706' : 'var(--color-text-dim)',
                            fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'all 0.2s'
                        }}>
                        <Trophy size={18} /> Liga
                    </button>
                    <button type="button" onClick={() => setIsRanked(false)}
                        style={{
                            padding: '12px', borderRadius: 'var(--radius-lg)',
                            border: !isRanked ? '2px solid #a855f7' : '1px solid var(--color-border)',
                            background: !isRanked ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
                            color: !isRanked ? '#9333ea' : 'var(--color-text-dim)',
                            fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'all 0.2s'
                        }}>
                        <PartyPopper size={18} /> Just 4 Fun
                    </button>
                </div>

                {/* Type Selection */}
                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: '600', color: 'var(--color-text)' }}>Turnier-Format</label>
                    <div style={{ position: 'relative' }}>
                        <select name="type" id="type" value={type} onChange={(e) => setType(e.target.value)} style={{
                            width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                            appearance: 'none', fontSize: '1rem', color: 'var(--color-text)'
                        }}>
                            <option value="SINGLE_ELIMINATION">K.O. System</option>
                            <option value="ROUND_ROBIN">Jeder gegen Jeden (Liga)</option>
                            <option value="GROUPS">Gruppenphase + K.O.</option>
                        </select>
                        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>▼</div>
                    </div>
                </div>

                {/* Return Leg Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div
                        onClick={() => setHasReturnLeg(!hasReturnLeg)}
                        style={{
                            position: 'relative',
                            width: '40px',
                            height: '24px',
                            backgroundColor: hasReturnLeg ? 'var(--color-primary)' : 'var(--color-border-strong)',
                            borderRadius: '24px',
                            cursor: 'pointer',
                            transition: 'background-color 0.3s ease',
                            flexShrink: 0
                        }}>
                        <div style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            width: '16px',
                            height: '16px',
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            transform: hasReturnLeg ? 'translateX(16px)' : 'translateX(0)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }} />
                        {hasReturnLeg && <input type="hidden" name="hasReturnLeg" value="on" />}
                    </div>
                    <label htmlFor="hasReturnLeg" style={{ cursor: 'pointer', fontWeight: '500', color: 'var(--color-text)' }}>
                        Rückrunde spielen? <span style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>(Hin- & Rückspiel)</span>
                    </label>
                </div>

                {/* Table Count Selection */}
                <div style={{ background: 'var(--color-surface-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-3)' }}>
                        <label style={{ fontWeight: '600', color: 'var(--color-text)' }}>Anzahl der Tische</label>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-primary)', background: 'var(--color-surface)', padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                            {tableCount}
                        </span>
                    </div>
                    <input
                        type="range"
                        name="tableCount"
                        min="1"
                        max="8"
                        value={tableCount}
                        onChange={(e) => setTableCount(parseInt(e.target.value))}
                        style={{
                            width: '100%',
                            accentColor: 'var(--color-primary)',
                            cursor: 'pointer'
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                        <span>1 Tisch</span>
                        <span>8 Tische</span>
                    </div>
                </div>

                <DurationForecast
                    key={`${type}-${hasReturnLeg}-${tableCount}-${customDate}-${startImmediately}`}
                    type={type}
                    hasReturnLeg={hasReturnLeg}
                    matchDuration={systemMatchDuration}
                    tableCount={tableCount}
                    startDate={startImmediately ? undefined : new Date(customDate)}
                />

                <button type="submit" className="btn btn-primary" style={{
                    marginTop: 'var(--spacing-2)', padding: '16px', fontSize: '1.2rem',
                    borderRadius: 'var(--radius-full)', background: 'var(--gradient-primary)',
                    boxShadow: 'var(--shadow-glow-primary)', letterSpacing: '0.5px'
                }}>
                    {startImmediately ? 'Jetzt starten' : 'Turnier planen'}
                </button>
            </form >
        </div >
    );
}

// Helper Component for Form Live Forecast
function DurationForecast({ type, hasReturnLeg, matchDuration, tableCount, startDate }: { type: string, hasReturnLeg: boolean, matchDuration: number, tableCount: number, startDate?: Date }) {
    const [estPlayers, setEstPlayers] = useState(8);
    const duration = useMemo(() => calculateTournamentDuration(type, estPlayers, tableCount, matchDuration, hasReturnLeg), [type, estPlayers, hasReturnLeg, matchDuration, tableCount]);
    const endTime = useMemo(() => getEstimatedEndTime(duration, startDate), [duration, startDate]);

    return (
        <div style={{ background: 'var(--color-surface-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-3)', fontWeight: '600', color: 'var(--color-text)' }}>
                Zeit-Prognose
            </label>

            <div style={{ marginBottom: 'var(--spacing-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-text-dim)' }}>Erwartete Spieler:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{estPlayers}</span>
                </div>
                <input
                    type="range"
                    min="2"
                    max="32"
                    value={estPlayers}
                    onChange={(e) => setEstPlayers(parseInt(e.target.value))}
                    style={{
                        width: '100%',
                        accentColor: 'var(--color-primary)',
                        cursor: 'pointer'
                    }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                <div style={{ background: 'var(--color-surface)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Dauer ca.</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDuration(duration)}</div>
                </div>
                <div style={{ background: 'var(--color-surface)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Ende ca.</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-secondary)', whiteSpace: 'nowrap' }}>{endTime} Uhr</div>
                </div>
            </div>
        </div>
    );
}

// --- Google Maps Components ---

const libraries: ("places")[] = ["places"];

function LocationPicker({ defaultValue, onLocationSelect }: { defaultValue: string, onLocationSelect: (addr: string, lat: number, lng: number) => void }) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    if (!isLoaded) return <div>Lade Karte...</div>;

    return <MapSearch onSelect={onLocationSelect} />;
}

function MapSearch({ onSelect }: { onSelect: (addr: string, lat: number, lng: number) => void }) {
    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            componentRestrictions: { country: "de" },
        },
        debounce: 300,
    });

    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

    const handleSelect = async (address: string) => {
        setValue(address, false);
        clearSuggestions();

        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            setSelectedLocation({ lat, lng });
            onSelect(address, lat, lng);
        } catch (error) {
            console.error("Error: ", error);
        }
    };

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
            <div style={{ position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)', pointerEvents: 'none' }} />
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={!ready}
                    className="input-field"
                    placeholder="Suche nach einem Ort..."
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '16px 16px 16px 48px', // Extra left padding for icon if we had one, but visually better anyway
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border-strong)',
                        color: 'var(--color-text)',
                        borderRadius: 'var(--radius-lg)',
                        fontSize: '1rem'
                    }}
                />
                {status === "OK" && (
                    <ul style={{
                        position: 'absolute',
                        zIndex: 10,
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        width: '100%',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: 0,
                        margin: 0,
                        listStyle: 'none',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        {data.map(({ place_id, description }) => (
                            <li
                                key={place_id}
                                onClick={() => handleSelect(description)}
                                style={{
                                    padding: 'var(--spacing-3)',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--color-border)',
                                    color: 'var(--color-text)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-transparent)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                {description}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {selectedLocation && (
                <div style={{ height: '200px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={selectedLocation}
                        zoom={15}
                        options={{
                            disableDefaultUI: true,
                            zoomControl: true,
                        }}
                    >
                        <Marker position={selectedLocation} />
                    </GoogleMap>
                </div>
            )}
        </div>
    );
}
