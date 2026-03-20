import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Branch { id: string; name: string; }

interface Props {
  value: string;
  onChange: (id: string, name: string) => void;
  className?: string;
}

const BranchSelector = ({ value, onChange, className = '' }: Props) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBranches().then(res => {
      setBranches(res.branches || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <select
      value={value}
      onChange={e => {
        const b = branches.find(b => b.id === e.target.value);
        if (b) onChange(b.id, b.name);
      }}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      disabled={loading}
    >
      <option value="">Select branch...</option>
      {branches.map(b => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
};

export default BranchSelector;
