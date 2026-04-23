export const SAMPLE_RESUME = {
    personal: {
        fullName: "Aarav Sharma",
        headline: "Senior Backend Engineer",
        email: "aarav.sharma@example.com",
        phone: "+91 98765 43210",
        location: "Bengaluru, KA",
        linkedin: "linkedin.com/in/aaravsharma",
        website: "aarav.dev",
    },
    summary: "Backend engineer with 4+ years building high-scale Python + FastAPI services. Shipped payment APIs at Flipkart handling 2M req/day and led a team of 3 engineers to migrate legacy systems to microservices. Passionate about system design, code quality, and mentoring.",
    experience: [
        {
            role: "Senior Backend Engineer", company: "Flipkart", location: "Bengaluru, KA",
            duration: "Jan 2023 — Present",
            bullets: [
                "Led payment gateway migration to FastAPI, reducing P99 latency from 800ms to 120ms",
                "Built fraud detection pipeline processing 2M transactions/day with 99.9% uptime",
                "Mentored 3 junior engineers through code reviews and architecture sessions",
                "Designed event-driven order state machine handling 500K orders/hour peak",
            ],
        },
        {
            role: "Software Engineer", company: "Razorpay", location: "Bengaluru, KA",
            duration: "Jul 2021 — Dec 2022",
            bullets: [
                "Developed REST APIs for merchant onboarding serving 50K+ businesses",
                "Reduced database query latency by 60% through indexing and N+1 elimination",
                "Shipped webhook retry system with exponential backoff and dead-letter queues",
            ],
        },
    ],
    skills: ["Python", "FastAPI", "Django", "PostgreSQL", "MongoDB", "Redis", "AWS", "Docker", "Kubernetes", "System Design", "REST APIs", "GraphQL"],
    education: [
        {
            degree: "B.Tech", field: "Computer Science",
            school: "Indian Institute of Technology, Roorkee",
            duration: "2017 — 2021", grade: "CGPA 8.4 / 10",
        },
    ],
    projects: [
        {
            name: "OpenRateLimit",
            description: "Production-ready rate limiter library for FastAPI with Redis backend.",
            bullets: ["1.2k+ GitHub stars", "Published to PyPI, 40K+ downloads"],
        },
    ],
    certifications: [
        { name: "AWS Certified Solutions Architect — Associate", issuer: "Amazon Web Services" },
    ],
    languages: ["English", "Hindi", "Kannada"],
    hobbies: ["Open source", "Long-distance running"],
};
