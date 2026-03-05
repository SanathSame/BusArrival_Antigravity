import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SearchBar from '../components/SearchBar';
import React from 'react';

describe('SearchBar', () => {
    it('calls onSearch with input value when form is submitted', () => {
        const onSearch = vi.fn();
        render(<SearchBar onSearch={onSearch} loading={false} />);

        const input = screen.getByPlaceholderText(/Enter Bus Stop Code/i);
        const button = screen.getByRole('button', { name: /search/i });

        fireEvent.change(input, { target: { value: '83139' } });
        fireEvent.click(button);

        expect(onSearch).toHaveBeenCalledWith('83139');
    });

    it('disables input when loading', () => {
        render(<SearchBar onSearch={() => { }} loading={true} />);
        const input = screen.getByPlaceholderText(/Enter Bus Stop Code/i);
        expect(input).toBeDisabled();
    });
});
