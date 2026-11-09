import {
    Cpu,
    Monitor,
    HardDrive,
    Zap,
    ShoppingCart,
    Search,
    Menu,
    ShieldCheck,
    Wrench,
    Bot,
    ArrowRight
} from "lucide-react";

const categories = [
    {
        name: "Processors",
        description: "Powerful CPUs for your computer.",
        icon: Cpu
    },
    {
        name: "Graphics Cards",
        description: "Graphics for gaming and productivity.",
        icon: Monitor
    },
    {
        name: "Storage",
        description: "Fast SSDs and reliable storage.",
        icon: HardDrive
    },
    {
        name: "Power Supplies",
        description: "Reliable power for your PC build.",
        icon: Zap
    }
];

const features = [
    {
        title: "PC Compatibility Checker",
        description: "Check if your selected PC components work together.",
        icon: ShieldCheck
    },
    {
        title: "PC Build Creator",
        description: "Choose your components and create your own PC build.",
        icon: Wrench
    },
    {
        title: "AI Build Assistant",
        description: "Get PC part recommendations based on your budget.",
        icon: Bot
    }
];

function App() {
    return (
        <div>
            <nav className="navbar">
                <div className="nav-container">
                    <a href="#" className="logo">
                        <Cpu size={28} />
                        <span>NEXUS<span className="blue-text">PC</span></span>
                    </a>

                    <div className="nav-links">
                        <a href="#home">Home</a>
                        <a href="#categories">Categories</a>
                        <a href="#features">Features</a>
                        <a href="#about">About</a>
                    </div>

                    <div className="nav-actions">
                        <button className="icon-button" aria-label="Search">
                            <Search size={20} />
                        </button>

                        <button className="icon-button" aria-label="Shopping cart">
                            <ShoppingCart size={20} />
                        </button>

                        <a href="#login" className="login-button">
                            Login
                        </a>
                    </div>

                    <button className="mobile-menu" aria-label="Menu">
                        <Menu size={25} />
                    </button>
                </div>
            </nav>

            <main>
                <section className="hero" id="home">
                    <div className="hero-content">
                        <span className="hero-label">
                            YOUR PC PARTS STORE
                        </span>

                        <h1>
                            Build Your Dream PC With
                            <span className="blue-text"> NEXUS PC.</span>
                        </h1>

                        <p>
                            Find the right computer components, check compatibility,
                            and create your perfect PC build in one place.
                        </p>

                        <div className="hero-buttons">
                            <a href="#categories" className="primary-button">
                                Explore Products <ArrowRight size={18} />
                            </a>

                            <a href="#features" className="secondary-button">
                                Explore Features
                            </a>
                        </div>

                        <div className="hero-info">
                            <span>✓ Quality PC Components</span>
                            <span>✓ Smart PC Building</span>
                            <span>✓ AI Recommendations</span>
                        </div>
                    </div>

                    <div className="hero-image">
                        <img
                            src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1000&q=85"
                            alt="Gaming computer setup"
                        />
                    </div>
                </section>

                <section className="categories section" id="categories">
                    <div className="section-heading">
                        <span className="section-label">SHOP BY CATEGORY</span>
                        <h2>Explore PC Components</h2>
                        <p>Find the components you need for your computer.</p>
                    </div>

                    <div className="category-grid">
                        {categories.map((category) => {
                            const Icon = category.icon;

                            return (
                                <div className="category-card" key={category.name}>
                                    <div className="category-icon">
                                        <Icon size={30} />
                                    </div>

                                    <h3>{category.name}</h3>
                                    <p>{category.description}</p>

                                    <a href="#categories">
                                        Explore <ArrowRight size={16} />
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="features section" id="features">
                    <div className="section-heading">
                        <span className="section-label">SMART FEATURES</span>
                        <h2>More Than Just a PC Parts Store</h2>
                        <p>Tools that help customers choose the right components.</p>
                    </div>

                    <div className="feature-grid">
                        {features.map((feature) => {
                            const Icon = feature.icon;

                            return (
                                <div className="feature-card" key={feature.title}>
                                    <div className="feature-icon">
                                        <Icon size={30} />
                                    </div>

                                    <h3>{feature.title}</h3>
                                    <p>{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="about section" id="about">
                    <div className="about-content">
                        <span className="section-label">ABOUT NEXUS PC</span>
                        <h2>Your Components. Your Build. Your Choice.</h2>

                        <p>
                            NEXUS PC is an online PC parts store designed to help
                            customers find computer components and build compatible
                            computer systems. It also provides smart recommendations
                            to make PC building easier.
                        </p>

                        <a href="#categories" className="primary-button">
                            Start Exploring <ArrowRight size={18} />
                        </a>
                    </div>
                </section>
            </main>

            <footer className="footer">
                <div className="footer-content">
                    <a href="#" className="logo">
                        <Cpu size={25} />
                        <span>NEXUS<span className="blue-text">PC</span></span>
                    </a>

                    <p>© 2026 NEXUS PC. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

export default App;