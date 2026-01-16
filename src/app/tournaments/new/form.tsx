'use client';

import { createTournament } from '@/app/actions/tournaments';
import { useRouter } from 'next/navigation';
import { Player } from '@prisma/client';
import { useState, useRef } from 'react';
import { Users, User, Trophy, PartyPopper, Play, Calendar } from 'lucide-react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

export default function CreateTournamentForm({ players }: { players: Player[] }) {
    const router = useRouter();
    const [startImmediately, setStartImmediately] = useState(true);
    const [mode, setMode] = useState<'SOLO' | 'TEAM'>('SOLO');
    const [isRanked, setIsRanked] = useState(true);
    const formRef = useRef<HTMLFormElement>(null);

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
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', maxWidth: '600px', margin: '0 auto' }}>
            <form ref={formRef} action={clientAction} style={{ display: 'grid', gap: 'var(--spacing-4)' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>Name des Turniers</label>
                    <input type="text" name="name" required style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }} placeholder="z.B. Montags-Pong" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>Ort</label>
                    <div style={{ width: '100%', boxSizing: 'border-box' }}>
                        <LocationPicker
                            defaultValue=""
                            onLocationSelect={(address, lat, lng) => {
                                // We create hidden inputs to submit this data with the form
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

                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-3)', fontWeight: 'bold', color: 'var(--color-primary)' }}>Wann geht es los?</label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginBottom: startImmediately ? '0' : 'var(--spacing-4)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="startImmediately"
                                value="on"
                                checked={startImmediately}
                                onChange={() => setStartImmediately(true)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span>Jetzt (Lobby öffnen)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="startImmediately"
                                value="off"
                                checked={!startImmediately}
                                onChange={() => setStartImmediately(false)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span>Später planen</span>
                        </label>
                    </div>

                    {!startImmediately && (
                        <input
                            type="datetime-local"
                            name="date"
                            required={!startImmediately}
                            defaultValue={new Date().toISOString().slice(0, 16)}
                            style={{ width: '96%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }}
                        />
                    )}
                </div>

                {/* Spielmodus: Solo vs Team */}
                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-3)', fontWeight: 'bold', color: 'var(--color-primary)' }}>Spielmodus</label>
                    <input type="hidden" name="mode" value={mode} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                        <button
                            type="button"
                            onClick={() => setMode('SOLO')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)',
                                padding: 'var(--spacing-4)',
                                background: mode === 'SOLO' ? 'rgba(255, 107, 107, 0.2)' : 'var(--color-surface)',
                                border: mode === 'SOLO' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <User size={32} style={{ color: mode === 'SOLO' ? 'var(--color-primary)' : 'var(--color-text-dim)' }} />
                            <span style={{ fontWeight: 'bold', color: mode === 'SOLO' ? 'var(--color-primary)' : 'var(--color-text)' }}>1 vs 1</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Solo-Matches</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('TEAM')}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)',
                                padding: 'var(--spacing-4)',
                                background: mode === 'TEAM' ? 'rgba(78, 205, 196, 0.2)' : 'var(--color-surface)',
                                border: mode === 'TEAM' ? '2px solid var(--color-secondary)' : '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Users size={32} style={{ color: mode === 'TEAM' ? 'var(--color-secondary)' : 'var(--color-text-dim)' }} />
                            <span style={{ fontWeight: 'bold', color: mode === 'TEAM' ? 'var(--color-secondary)' : 'var(--color-text)' }}>2 vs 2</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Team-Matches</span>
                        </button>
                    </div>
                </div>

                {/* Wertung: Liga vs Spaß */}
                <div className="glass-panel" style={{ padding: 'var(--spacing-4)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-3)', fontWeight: 'bold', color: 'var(--color-primary)' }}>Wertung</label>
                    <input type="hidden" name="isRanked" value={isRanked ? 'true' : 'false'} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                        <button
                            type="button"
                            onClick={() => setIsRanked(true)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)',
                                padding: 'var(--spacing-4)',
                                background: isRanked ? 'rgba(255, 215, 0, 0.15)' : 'var(--color-surface)',
                                border: isRanked ? '2px solid #FFD700' : '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Trophy size={24} style={{ color: isRanked ? '#FFD700' : 'var(--color-text-dim)' }} />
                            <span style={{ fontWeight: 'bold', color: isRanked ? '#FFD700' : 'var(--color-text)' }}>Liga-Turnier</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textAlign: 'center' }}>Zählt in Statistik</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsRanked(false)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)',
                                padding: 'var(--spacing-4)',
                                background: !isRanked ? 'rgba(155, 89, 182, 0.2)' : 'var(--color-surface)',
                                border: !isRanked ? '2px solid #9b59b6' : '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <PartyPopper size={24} style={{ color: !isRanked ? '#9b59b6' : 'var(--color-text-dim)' }} />
                            <span style={{ fontWeight: 'bold', color: !isRanked ? '#9b59b6' : 'var(--color-text)' }}>Spaß-Turnier</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', textAlign: 'center' }}>Gäste erlaubt</span>
                        </button>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: 'var(--spacing-2)', fontWeight: 'bold', color: 'var(--color-text)' }}>Turnier-Format</label>
                    <select name="type" id="type" className="input-field" style={{ width: '100%', padding: 'var(--spacing-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)' }}>
                        <option value="SINGLE_ELIMINATION">K.O. System</option>
                        <option value="ROUND_ROBIN">Jeder gegen Jeden (Liga)</option>
                        <option value="GROUPS">Gruppenphase + K.O.</option>
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
                    <input type="checkbox" id="hasReturnLeg" name="hasReturnLeg" style={{ width: '20px', height: '20px' }} />
                    <label htmlFor="hasReturnLeg" style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-secondary)' }}>Rückrunde spielen? (Hin- & Rückspiel)</label>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--spacing-4)', padding: 'var(--spacing-4)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {startImmediately ? <><Play size={20} /> Turnier-Lobby öffnen</> : <><Calendar size={20} /> Turnier planen</>}
                </button>
            </form>
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
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={!ready}
                    className="input-field"
                    placeholder="Suche nach einem Ort..."
                    style={{
                        width: '100%',
                        boxSizing: 'border-box', // Fix width issue
                        padding: 'var(--spacing-3)',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        borderRadius: 'var(--radius-sm)'
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
