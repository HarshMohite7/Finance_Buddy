"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface QrScannerModalProps {
    amount: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function QrScannerModal({ amount, isOpen, onClose }: QrScannerModalProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // If the modal is not open, do not initialize the scanner
        if (!isOpen) return;

        // Initialize the scanner
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            },
            false
        );

        scannerRef.current = scanner;

        scanner.render(
            (decodedText) => {
                // Stop scanning once a QR code is detected
                scanner.clear();

                // Check if the scanned QR code is a valid UPI string
                if (decodedText.toLowerCase().startsWith("upi://pay")) {
                    try {
                        // Parse the UPI URL parameters
                        const upiUrl = new URL(decodedText);
                        const pa = upiUrl.searchParams.get("pa"); // Payee VPA (Merchant ID)
                        const pn = upiUrl.searchParams.get("pn") || "Merchant"; // Payee Name

                        if (pa) {
                            // Construct the final deep link with the scanned merchant AND your app's amount
                            const finalUpiLink = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${amount.toFixed(2)}&cu=INR`;

                            // Launch Google Pay (or default UPI app) natively
                            window.location.href = finalUpiLink;
                        } else {
                            alert("Invalid UPI QR Code: Missing Payee Address (pa).");
                        }
                    } catch (error) {
                        alert("Failed to parse the UPI QR Code.");
                    }
                } else {
                    alert("Scanned QR code is not a valid UPI payment code.");
                }

                // Close the modal after a successful scan
                onClose();
            },
            (errorMessage) => {
                // Silently ignore standard scanning errors (like when no QR is currently in frame)
            }
        );

        // Cleanup function to stop the camera when the modal closes
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch((err) => {
                    console.error("Failed to clear scanner", err);
                });
            }
        };
    }, [isOpen, amount, onClose]);

    // If the modal is not open, render nothing
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
                <div className="text-center">
                    <h3 className="mb-1 text-xl font-bold text-zinc-900 dark:text-white">
                        Scan to Pay
                    </h3>
                    <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                        Point your camera at any merchant's UPI QR code to send exactly <strong className="text-violet-600 dark:text-violet-400">₹{amount.toFixed(2)}</strong>
                    </p>
                </div>

                {/* The scanner library will automatically inject the video feed here */}
                <div
                    id="qr-reader"
                    className="overflow-hidden rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700"
                />

                <button
                    onClick={onClose}
                    className="mt-6 w-full rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                    Cancel Scanning
                </button>
            </div>
        </div>
    );
}