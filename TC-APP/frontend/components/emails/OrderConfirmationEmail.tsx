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

interface OrderConfirmationEmailProps {
    buyerName?: string;
    productName?: string;
    orderUrl?: string;
    price?: number;
}

export const OrderConfirmationEmail = ({
    buyerName = "Collector",
    productName = "Your New Card",
    orderUrl = "http://localhost:3000/orders/buy",
    price = 0,
}: OrderConfirmationEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Order Confirmed: {productName}</Preview>
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
                                Order Confirmed!
                            </Text>
                            <Text className="text-[#9CA3AF] text-[14px] leading-[24px] text-center mt-6">
                                Thank you for your purchase, {buyerName}.
                            </Text>
                            <Text className="text-white text-[16px] font-bold text-center mt-2">
                                {productName}
                            </Text>
                            <Text className="text-[#FFD700] font-mono text-[16px] font-bold text-center mt-2">
                                ¥{price.toLocaleString()}
                            </Text>

                            <Text className="text-[#9CA3AF] text-[14px] leading-[24px] text-center mt-6">
                                The seller has been notified and will ship your item soon.
                                You will receive another email when it ships.
                            </Text>
                        </Section>
                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="bg-[#FFD700] rounded text-black px-8 py-4 font-bold text-[14px] no-underline tracking-wide"
                                href={orderUrl}
                            >
                                VIEW ORDER
                            </Button>
                        </Section>
                        <Section>
                            <Text className="text-[#6B7280] text-[12px] leading-[20px] text-center">
                                Thank you for using Stadium Card.<br />
                                © 2024 Stadium Card Team.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default OrderConfirmationEmail;
