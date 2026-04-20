'use client';

import { useState } from 'react';
import { requestRoom, acceptRoomRequest, rejectRoomRequest } from '@/app/actions/reservations';
import { BedDouble, Check, X, Clock, Info, Coffee, Utensils } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function GuestRoomInfo({ tournamentId, title, description, capacity, image, offersBreakfast, offersHalfBoard, reservations, isHost, currentUserId }: any) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [isRequesting, setIsRequesting] = useState(false);
    const [wantsBreakfast, setWantsBreakfast] = useState(false);
    const [wantsHalfBoard, setWantsHalfBoard] = useState(false);
    const router = useRouter();
    const t = useTranslations('guestRoom');

    const handleRequest = async () => {
        setIsRequesting(true);
        const res = await requestRoom(tournamentId, wantsBreakfast, wantsHalfBoard);
        if (!res.success) alert(res.error || t('errorRequest'));
        setIsRequesting(false);
        router.refresh();
    };

    const handleAccept = async (id: string) => {
        setLoadingId(id);
        const res = await acceptRoomRequest(id);
        if (!res.success) alert(res.error || t('errorAccept'));
        setLoadingId(null);
        router.refresh();
    };

    const handleReject = async (id: string) => {
        setLoadingId(id);
        const res = await rejectRoomRequest(id);
        if (!res.success) alert(res.error || t('errorReject'));
        setLoadingId(null);
        router.refresh();
    };

    const currentUserReservation = reservations.find((r: any) => r.userId === currentUserId);
    const confirmedCount = reservations.filter((r: any) => r.status === 'CONFIRMED').length;

    return (
        <div style={{ background: 'var(--color-surface-secondary)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', marginBottom: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-3)' }}>
                <BedDouble size={20} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{title || t('title')}</h3>
            </div>
            
            {image && (
                <div style={{ marginBottom: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Guest Room" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', display: 'block' }} />
                </div>
            )}
            
            <p style={{ margin: '0 0 var(--spacing-3)', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
                {description || t('defaultDescription')}
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-4)', fontSize: '0.85rem' }}>
                <Info size={14} color="var(--color-text-dim)" />
                <span>{t('capacity', { confirmed: confirmedCount, total: capacity })}</span>
            </div>

            {!isHost && currentUserId && (
                <div style={{ padding: 'var(--spacing-3)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                    {currentUserReservation ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: currentUserReservation.status === 'CONFIRMED' ? '#10b981' : currentUserReservation.status === 'REJECTED' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                            {currentUserReservation.status === 'CONFIRMED' && <Check size={16} />}
                            {currentUserReservation.status === 'PENDING' && <Clock size={16} />}
                            {currentUserReservation.status === 'REJECTED' && <X size={16} />}
                            <span>
                                {currentUserReservation.status === 'CONFIRMED' ? t('statusConfirmed') : currentUserReservation.status === 'PENDING' ? t('statusPending') : t('statusRejected')}
                            </span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                            {(offersBreakfast || offersHalfBoard) && (
                                <div style={{ background: 'var(--color-surface-secondary)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                    <p style={{ margin: '0 0 var(--spacing-2)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-dim)' }}>{t('extras')}</p>
                                    {offersBreakfast && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '8px' }}>
                                            <input type="checkbox" checked={wantsBreakfast} onChange={e => setWantsBreakfast(e.target.checked)} />
                                            <Coffee size={14} /> {t('breakfast')}
                                        </label>
                                    )}
                                    {offersHalfBoard && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            <input type="checkbox" checked={wantsHalfBoard} onChange={e => setWantsHalfBoard(e.target.checked)} />
                                            <Utensils size={14} /> {t('halfBoard')}
                                        </label>
                                    )}
                                </div>
                            )}
                            <button 
                                onClick={handleRequest} 
                                disabled={isRequesting || confirmedCount >= capacity}
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                            >
                                {isRequesting ? t('requesting') : confirmedCount >= capacity ? t('full') : t('requestSpot')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {isHost && reservations.length > 0 && (
                <div style={{ marginTop: 'var(--spacing-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-3)' }}>
                    <h4 style={{ margin: '0 0 var(--spacing-2)', fontSize: '0.9rem', fontWeight: 600 }}>{t('manageRequests')}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                        {reservations.map((r: any) => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-2)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                                <div>
                                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{r.user.name || r.user.email}</span>
                                    {r.wantsBreakfast && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', background: 'var(--color-surface-secondary)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}><Coffee size={10} /> Frühstück</span>}
                                    {r.wantsHalfBoard && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', background: 'var(--color-surface-secondary)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}><Utensils size={10} /> HP</span>}
                                    <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '4px', color: r.status === 'CONFIRMED' ? '#10b981' : r.status === 'REJECTED' ? '#ef4444' : '#f59e0b' }}>
                                        {r.status}
                                    </span>
                                </div>
                                {r.status === 'PENDING' && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => handleAccept(r.id)} 
                                            disabled={loadingId === r.id || confirmedCount >= capacity}
                                            style={{ padding: '6px', cursor: 'pointer', background: '#10b98120', color: '#10b981', border: 'none', borderRadius: '4px' }}
                                            title="Bestätigen"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleReject(r.id)} 
                                            disabled={loadingId === r.id}
                                            style={{ padding: '6px', cursor: 'pointer', background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: '4px' }}
                                            title="Ablehnen"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
