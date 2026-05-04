import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Branch { id: string; name: string; }

interface Props {
  value: string;
  onChange: (id: string, name: string) => void;
  className?: string;
}

const BranchSelector = ({ value, onChange, className = '' }: Props) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase
      .from('branches')
      .select('id, name')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setError('Unable to load branches');
        } else {
          setBranches(data || []);
          setError('');
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const hasBranches = branches.length > 0;
  const isDisabled = loading || !!error || !hasBranches;

  return (
    <div className="space-y-1.5">
      <select
        value={value}
        onChange={e => {
          const b = branches.find(b => b.id === e.target.value);
          if (b) onChange(b.id, b.name);
        }}
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring ${className}`}
        disabled={isDisabled}
        aria-busy={loading}
      >
        <option value="">
          {loading
            ? 'Loading branches...'
            : error
              ? 'Failed to load branches'
              : hasBranches
                ? 'Select branch...'
                : 'No branches available'}
        </option>
        {branches.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}. Please try again.</p>}
      {!loading && !error && !hasBranches && (
        <p className="text-xs text-muted-foreground">No branches are available right now.</p>
      )}
    </div>
  );
};

export default BranchSelector;
