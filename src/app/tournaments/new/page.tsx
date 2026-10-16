import CreateTournamentForm from './form';

export const dynamic = 'force-dynamic';

export default async function NewTournamentPage() {
    return (
        <div className="container page-content">
            <CreateTournamentForm />
        </div>
    );
}
