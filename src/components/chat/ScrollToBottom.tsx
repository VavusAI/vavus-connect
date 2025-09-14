import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

interface Props {
    show: boolean;
    onClick: () => void;
}

const ScrollToBottom: React.FC<Props> = ({ show, onClick }) => {
    if (!show) return null;
    return (
        <Button onClick={onClick} size="sm" className="absolute bottom-4 right-4">
            <ArrowDown className="h-4 w-4 mr-1" />
            Jump to latest
        </Button>
    );
};

export default ScrollToBottom;