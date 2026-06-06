import React from 'react';

interface Props {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const SearchBar: React.FC<Props> = ({ searchTerm, setSearchTerm }) => {
  return (
    <div className="card">
      <h3>🔍 Поиск</h3>
      <input
        type="text"
        className="search-input"
        placeholder="Фильтр: ФИО, группа, специальность"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;