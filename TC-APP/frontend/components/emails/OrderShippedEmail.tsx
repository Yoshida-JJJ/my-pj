import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Button,
    Preview,
    Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface OrderShippedEmailProps {
    buyerName?: string;
    productName?: string;
    trackingNumber?: string;
    carrier?: string;
    orderUrl?: string; // Link to order detail
    baseUrl?: string;
}

export const OrderShippedEmail = ({
    buyerName = "Collector",
    productName = "Your Item",
    trackingNumber,
    carrier,
    orderUrl = "http://localhost:3000/orders",
}: OrderShippedEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Your order has been shipped!</Preview>
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                brand: {
                                    dark: '#0a0a0a',
                                    gold: '#FFD700',
                                    platinum: '#E5E4E2',
                                },
                            },
                        },
                    },
                }}
            >
                <Body className="bg-black my-auto mx-auto font-sans">
                    <Container className="border border-[#FFD700] rounded mx-auto p-8 max-w-[465px] bg-[#111111] my-[40px]">
                        <Section className="mt-[20px]">
                            <Text className="text-[#FFD700] text-3xl font-bold text-center tracking-widest p-0 my-0">
                                STADIUM CARD
                            </Text>
                        </Section>
                        <Section className="mt-[32px]">
                            <Text className="text-[#E5E4E2] text-[20px] font-normal text-center p-0 my-0 mx-0">
                                Your Item is on the Way, {buyerName}
                            </Text>
                            <Text className="text-[#9CA3AF] text-[14px] leading-[24px] text-center mt-6">
                                The following item has been shipped:
                            </Text>
                            <Text className="text-white text-[16px] font-bold text-center mt-2">
                                {productName}
                            </Text>

                            {(trackingNumber || carrier) && (
                                <Section className="mt-4 p-4 bg-white/5 rounded border border-white/10 text-center">
                                    {carrier && (
                                        <Text className="text-[#E5E4E2] text-[14px] m-0">
                                            Carrier: {carrier}
                                        </Text>
                                    )}
                                    {trackingNumber && (
                                        <Text className="text-[#FFD700] text-[16px] font-mono m-0 mt-1">
                                            Tracking: {trackingNumber}
                                        </Text>
                                    )}
                                </Section>
                            )}

                        </Section>
                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="bg-[#FFD700] rounded text-black px-8 py-4 font-bold text-[14px] no-underline tracking-wide"
                                href={orderUrl}
                            >
                                VIEW ORDER STATUS
                            </Button>
                        </Section>
                        <Section>
                            <Text className="text-[#6B7280] text-[12px] leading-[20px] text-center">
                                Please click "Received" when the item arrives.<br />
                                © 2024 Stadium Card Team.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default OrderShippedEmail;
