"use client"

import { useEffect, useState } from "react";
import axios from "axios";
import API_URL from '@/config/api';
import { useSessionStore } from '@/lib/store/sessionStore';

const CreditsDisplay: React.FC = () => {
    const [credits, setCredits] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { sessionId } = useSessionStore();

    useEffect(() => {
        const fetchCredits = async () => {
            if (!sessionId) {
                setError("No session ID available");
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(`${API_URL}/api/user/credits`, {
                    headers: {
                        'X-Session-ID': sessionId
                    }
                });
                console.log("Credits response:", response.data);
                setCredits(response.data.credits);
            } catch (err) {
                setError("Failed to fetch credits. Please try again later.");
                console.error("Error fetching credits:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCredits();

        // Set up a refresh interval every minute
        const interval = setInterval(fetchCredits, 60000);
        return () => clearInterval(interval);
    }, [sessionId]);

    return (
        <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold">Remaining Credits</h3>
            {loading ? (
                <p className="text-gray-500">Loading...</p>
            ) : error ? (
                <p className="text-red-500 text-sm">{error}</p>
            ) : (
                <p className="text-xl font-medium">{credits} credits</p>
            )}
        </div>
    );
};

export default CreditsDisplay; 