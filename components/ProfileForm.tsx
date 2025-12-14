import React, { useState } from 'react';
import { ChildProfile } from '../types';

interface ProfileFormProps {
  onSave: (profile: Omit<ChildProfile, 'id'>) => void;
  onCancel?: () => void;
  isInitial?: boolean;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ onSave, onCancel, isInitial = false }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'boy' | 'girl' | 'other'>('boy');
  const [temperament, setTemperament] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age) return;
    
    onSave({
      name,
      age: parseInt(age, 10),
      gender,
      temperament
    });
  };

  return (
    <div className={`bg-white ${isInitial ? 'p-8 rounded-2xl shadow-xl border border-stone-100 max-w-md mx-auto' : 'p-0'}`}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-stone-800 mb-2">
          {isInitial ? '建立寶貝檔案' : '新增一位孩子'}
        </h2>
        <p className="text-stone-500 text-sm">
          {isInitial ? '讓我更了解您的孩子，運用心理學提供精準建議。' : '為另一個孩子建立專屬的諮詢檔案。'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">孩子暱稱</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            placeholder="例如：小明"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">年齡 (歲)</label>
          <input
            type="number"
            required
            min="0"
            max="18"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            placeholder="例如：5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">性別</label>
          <div className="flex gap-4">
            {(['boy', 'girl', 'other'] as const).map((g) => (
              <label key={g} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={gender === g}
                  onChange={() => setGender(g)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <span className="ml-2 text-stone-700 capitalize">
                  {g === 'boy' ? '男孩' : g === 'girl' ? '女孩' : '其他'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">特質/備註 (選填)</label>
          <textarea
            value={temperament}
            onChange={(e) => setTemperament(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            placeholder="例如：比較敏感、或是精力充沛..."
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-stone-100 text-stone-600 py-3 rounded-xl font-medium hover:bg-stone-200 transition-colors"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg transform active:scale-95 duration-200"
          >
            {isInitial ? '開始諮詢' : '新增檔案'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;