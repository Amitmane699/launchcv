"""
Skill Gap Radar engine.
Compares user skills against the top 100 job listings for a target role title,
then produces a radar with frequency scores, gap severity, and learning paths.
No AI — fully rule-based aggregation over job_listings collection.
"""
import re
from collections import Counter
from typing import Dict, List, Optional

# ── Master role→canonical-skills database ────────────────────────────────────
# Each skill has: weight (how important), category (group for radar), resources
ROLE_SKILLS: Dict[str, List[Dict]] = {

    "frontend": [
        {"skill": "React",         "weight": 10, "cat": "Framework",  "learn": "react.dev"},
        {"skill": "TypeScript",    "weight": 9,  "cat": "Language",   "learn": "typescriptlang.org"},
        {"skill": "JavaScript",    "weight": 9,  "cat": "Language",   "learn": "javascript.info"},
        {"skill": "HTML",          "weight": 8,  "cat": "Core",       "learn": "developer.mozilla.org"},
        {"skill": "CSS",           "weight": 8,  "cat": "Core",       "learn": "css-tricks.com"},
        {"skill": "Next.js",       "weight": 7,  "cat": "Framework",  "learn": "nextjs.org"},
        {"skill": "Git",           "weight": 7,  "cat": "Tool",       "learn": "git-scm.com"},
        {"skill": "REST API",      "weight": 7,  "cat": "Integration","learn": "restfulapi.net"},
        {"skill": "Testing",       "weight": 6,  "cat": "Quality",    "learn": "jestjs.io"},
        {"skill": "Webpack",       "weight": 5,  "cat": "Tool",       "learn": "webpack.js.org"},
        {"skill": "Figma",         "weight": 5,  "cat": "Design",     "learn": "figma.com"},
        {"skill": "Performance",   "weight": 5,  "cat": "Quality",    "learn": "web.dev/performance"},
        {"skill": "Redux",         "weight": 4,  "cat": "State",      "learn": "redux.js.org"},
        {"skill": "GraphQL",       "weight": 4,  "cat": "Integration","learn": "graphql.org"},
        {"skill": "Docker",        "weight": 3,  "cat": "DevOps",     "learn": "docs.docker.com"},
    ],

    "backend": [
        {"skill": "Python",        "weight": 9,  "cat": "Language",   "learn": "python.org"},
        {"skill": "Node.js",       "weight": 8,  "cat": "Runtime",    "learn": "nodejs.org"},
        {"skill": "REST API",      "weight": 9,  "cat": "Design",     "learn": "restfulapi.net"},
        {"skill": "PostgreSQL",    "weight": 8,  "cat": "Database",   "learn": "postgresql.org"},
        {"skill": "MongoDB",       "weight": 7,  "cat": "Database",   "learn": "mongodb.com/docs"},
        {"skill": "Docker",        "weight": 8,  "cat": "DevOps",     "learn": "docs.docker.com"},
        {"skill": "Redis",         "weight": 7,  "cat": "Cache",      "learn": "redis.io"},
        {"skill": "Git",           "weight": 7,  "cat": "Tool",       "learn": "git-scm.com"},
        {"skill": "AWS",           "weight": 7,  "cat": "Cloud",      "learn": "aws.amazon.com/training"},
        {"skill": "SQL",           "weight": 8,  "cat": "Database",   "learn": "sqlbolt.com"},
        {"skill": "Microservices", "weight": 6,  "cat": "Design",     "learn": "microservices.io"},
        {"skill": "Kafka",         "weight": 5,  "cat": "Messaging",  "learn": "kafka.apache.org"},
        {"skill": "Testing",       "weight": 7,  "cat": "Quality",    "learn": "pytest.org"},
        {"skill": "FastAPI",       "weight": 5,  "cat": "Framework",  "learn": "fastapi.tiangolo.com"},
        {"skill": "Java",          "weight": 6,  "cat": "Language",   "learn": "java.com"},
    ],

    "fullstack": [
        {"skill": "React",         "weight": 9,  "cat": "Frontend",   "learn": "react.dev"},
        {"skill": "Node.js",       "weight": 9,  "cat": "Backend",    "learn": "nodejs.org"},
        {"skill": "TypeScript",    "weight": 8,  "cat": "Language",   "learn": "typescriptlang.org"},
        {"skill": "SQL",           "weight": 8,  "cat": "Database",   "learn": "sqlbolt.com"},
        {"skill": "MongoDB",       "weight": 7,  "cat": "Database",   "learn": "mongodb.com/docs"},
        {"skill": "REST API",      "weight": 8,  "cat": "Design",     "learn": "restfulapi.net"},
        {"skill": "Git",           "weight": 7,  "cat": "Tool",       "learn": "git-scm.com"},
        {"skill": "Docker",        "weight": 7,  "cat": "DevOps",     "learn": "docs.docker.com"},
        {"skill": "AWS",           "weight": 6,  "cat": "Cloud",      "learn": "aws.amazon.com/training"},
        {"skill": "CSS",           "weight": 6,  "cat": "Frontend",   "learn": "css-tricks.com"},
        {"skill": "GraphQL",       "weight": 5,  "cat": "Integration","learn": "graphql.org"},
        {"skill": "Testing",       "weight": 6,  "cat": "Quality",    "learn": "jestjs.io"},
        {"skill": "Next.js",       "weight": 6,  "cat": "Framework",  "learn": "nextjs.org"},
        {"skill": "Redis",         "weight": 5,  "cat": "Cache",      "learn": "redis.io"},
        {"skill": "Linux",         "weight": 5,  "cat": "OS",         "learn": "linuxcommand.org"},
    ],

    "data science": [
        {"skill": "Python",        "weight": 10, "cat": "Language",   "learn": "python.org"},
        {"skill": "SQL",           "weight": 9,  "cat": "Database",   "learn": "sqlbolt.com"},
        {"skill": "Pandas",        "weight": 9,  "cat": "Library",    "learn": "pandas.pydata.org"},
        {"skill": "Machine Learning","weight":8, "cat": "Core",       "learn": "coursera.org/learn/machine-learning"},
        {"skill": "Statistics",    "weight": 8,  "cat": "Core",       "learn": "khanacademy.org/math/statistics"},
        {"skill": "NumPy",         "weight": 7,  "cat": "Library",    "learn": "numpy.org"},
        {"skill": "Scikit-learn",  "weight": 7,  "cat": "Library",    "learn": "scikit-learn.org"},
        {"skill": "Tableau",       "weight": 6,  "cat": "Viz",        "learn": "tableau.com/learn"},
        {"skill": "Power BI",      "weight": 6,  "cat": "Viz",        "learn": "learn.microsoft.com/power-bi"},
        {"skill": "Matplotlib",    "weight": 5,  "cat": "Viz",        "learn": "matplotlib.org"},
        {"skill": "TensorFlow",    "weight": 5,  "cat": "Deep Learning","learn":"tensorflow.org"},
        {"skill": "Git",           "weight": 6,  "cat": "Tool",       "learn": "git-scm.com"},
        {"skill": "Spark",         "weight": 5,  "cat": "Big Data",   "learn": "spark.apache.org"},
        {"skill": "Excel",         "weight": 7,  "cat": "Tool",       "learn": "microsoft.com/excel"},
        {"skill": "NLP",           "weight": 4,  "cat": "AI",         "learn": "nltk.org"},
    ],

    "devops": [
        {"skill": "Docker",        "weight": 10, "cat": "Container",  "learn": "docs.docker.com"},
        {"skill": "Kubernetes",    "weight": 9,  "cat": "Orchestration","learn":"kubernetes.io/docs"},
        {"skill": "AWS",           "weight": 9,  "cat": "Cloud",      "learn": "aws.amazon.com/training"},
        {"skill": "CI/CD",         "weight": 9,  "cat": "Pipeline",   "learn": "www.atlassian.com/devops"},
        {"skill": "Terraform",     "weight": 8,  "cat": "IaC",        "learn": "developer.hashicorp.com/terraform"},
        {"skill": "Linux",         "weight": 8,  "cat": "OS",         "learn": "linuxcommand.org"},
        {"skill": "Git",           "weight": 8,  "cat": "Tool",       "learn": "git-scm.com"},
        {"skill": "Jenkins",       "weight": 7,  "cat": "CI/CD",      "learn": "jenkins.io"},
        {"skill": "Prometheus",    "weight": 6,  "cat": "Monitoring", "learn": "prometheus.io"},
        {"skill": "Grafana",       "weight": 6,  "cat": "Monitoring", "learn": "grafana.com"},
        {"skill": "Ansible",       "weight": 6,  "cat": "IaC",        "learn": "ansible.com"},
        {"skill": "Python",        "weight": 6,  "cat": "Scripting",  "learn": "python.org"},
        {"skill": "Bash",          "weight": 7,  "cat": "Scripting",  "learn": "gnu.org/software/bash"},
        {"skill": "GCP",           "weight": 5,  "cat": "Cloud",      "learn": "cloud.google.com/training"},
        {"skill": "Networking",    "weight": 6,  "cat": "Core",       "learn": "networkacademy.io"},
    ],

    "mobile": [
        {"skill": "React Native",  "weight": 9,  "cat": "Framework",  "learn": "reactnative.dev"},
        {"skill": "Flutter",       "weight": 8,  "cat": "Framework",  "learn": "flutter.dev"},
        {"skill": "Kotlin",        "weight": 8,  "cat": "Language",   "learn": "kotlinlang.org"},
        {"skill": "Swift",         "weight": 7,  "cat": "Language",   "learn": "swift.org"},
        {"skill": "Android",       "weight": 8,  "cat": "Platform",   "learn": "developer.android.com"},
        {"skill": "iOS",           "weight": 7,  "cat": "Platform",   "learn": "developer.apple.com"},
        {"skill": "REST API",      "weight": 8,  "cat": "Integration","learn": "restfulapi.net"},
        {"skill": "Git",           "weight": 7,  "cat": "Tool",       "learn": "git-scm.com"},
        {"skill": "Firebase",      "weight": 7,  "cat": "Backend",    "learn": "firebase.google.com"},
        {"skill": "SQLite",        "weight": 5,  "cat": "Storage",    "learn": "sqlite.org"},
        {"skill": "Push Notifications","weight":6,"cat":"Feature",    "learn": "firebase.google.com/docs/cloud-messaging"},
        {"skill": "Testing",       "weight": 5,  "cat": "Quality",    "learn": "testing.googleblog.com"},
        {"skill": "Figma",         "weight": 5,  "cat": "Design",     "learn": "figma.com"},
        {"skill": "App Store",     "weight": 5,  "cat": "Distribution","learn":"developer.apple.com"},
        {"skill": "Play Store",    "weight": 5,  "cat": "Distribution","learn":"play.google.com/console"},
    ],

    "machine learning": [
        {"skill": "Python",        "weight": 10, "cat": "Language",   "learn": "python.org"},
        {"skill": "TensorFlow",    "weight": 9,  "cat": "Framework",  "learn": "tensorflow.org"},
        {"skill": "PyTorch",       "weight": 9,  "cat": "Framework",  "learn": "pytorch.org"},
        {"skill": "Scikit-learn",  "weight": 8,  "cat": "ML",         "learn": "scikit-learn.org"},
        {"skill": "Deep Learning", "weight": 8,  "cat": "Core",       "learn": "deeplearning.ai"},
        {"skill": "Statistics",    "weight": 8,  "cat": "Core",       "learn": "khanacademy.org/math/statistics"},
        {"skill": "SQL",           "weight": 7,  "cat": "Database",   "learn": "sqlbolt.com"},
        {"skill": "NumPy",         "weight": 7,  "cat": "Library",    "learn": "numpy.org"},
        {"skill": "Pandas",        "weight": 7,  "cat": "Library",    "learn": "pandas.pydata.org"},
        {"skill": "NLP",           "weight": 7,  "cat": "Speciality", "learn": "huggingface.co"},
        {"skill": "Computer Vision","weight": 6, "cat": "Speciality", "learn": "opencv.org"},
        {"skill": "MLOps",         "weight": 6,  "cat": "Ops",        "learn": "ml-ops.org"},
        {"skill": "Git",           "weight": 6,  "cat": "Tool",       "learn": "git-scm.com"},
        {"skill": "AWS",           "weight": 5,  "cat": "Cloud",      "learn": "aws.amazon.com/machine-learning"},
        {"skill": "Linear Algebra","weight": 6,  "cat": "Math",       "learn": "khanacademy.org/math/linear-algebra"},
    ],

    "product manager": [
        {"skill": "Product Roadmap","weight":9,  "cat": "Core",       "learn": "productschool.com"},
        {"skill": "Agile",         "weight": 9,  "cat": "Methodology","learn": "agilemanifesto.org"},
        {"skill": "Scrum",         "weight": 8,  "cat": "Methodology","learn": "scrum.org"},
        {"skill": "JIRA",          "weight": 8,  "cat": "Tool",       "learn": "atlassian.com/jira"},
        {"skill": "User Research", "weight": 8,  "cat": "Discovery",  "learn": "nngroup.com"},
        {"skill": "A/B Testing",   "weight": 7,  "cat": "Analytics",  "learn": "optimizely.com"},
        {"skill": "SQL",           "weight": 7,  "cat": "Analytics",  "learn": "sqlbolt.com"},
        {"skill": "Analytics",     "weight": 8,  "cat": "Core",       "learn": "analytics.google.com"},
        {"skill": "Figma",         "weight": 6,  "cat": "Design",     "learn": "figma.com"},
        {"skill": "Stakeholder Mgmt","weight":7, "cat": "Soft Skill", "learn": "pmi.org"},
        {"skill": "Prioritisation","weight": 7,  "cat": "Core",       "learn": "productschool.com"},
        {"skill": "Wireframing",   "weight": 5,  "cat": "Design",     "learn": "balsamiq.com"},
        {"skill": "OKRs",          "weight": 6,  "cat": "Strategy",   "learn": "whatmatters.com"},
        {"skill": "Competitive Analysis","weight":6,"cat":"Strategy", "learn": "productboard.com"},
        {"skill": "Excel",         "weight": 6,  "cat": "Tool",       "learn": "microsoft.com/excel"},
    ],

    "ui/ux designer": [
        {"skill": "Figma",         "weight": 10, "cat": "Tool",       "learn": "figma.com"},
        {"skill": "Prototyping",   "weight": 9,  "cat": "Core",       "learn": "invisionapp.com"},
        {"skill": "User Research", "weight": 9,  "cat": "Research",   "learn": "nngroup.com"},
        {"skill": "Wireframing",   "weight": 8,  "cat": "Core",       "learn": "balsamiq.com"},
        {"skill": "Adobe XD",      "weight": 7,  "cat": "Tool",       "learn": "adobe.com/xd"},
        {"skill": "Usability Testing","weight":8,"cat":"Research",    "learn": "nngroup.com"},
        {"skill": "Design Systems","weight": 7,  "cat": "Systems",    "learn": "designsystems.com"},
        {"skill": "Typography",    "weight": 6,  "cat": "Visual",     "learn": "fonts.google.com"},
        {"skill": "Color Theory",  "weight": 6,  "cat": "Visual",     "learn": "colormatters.com"},
        {"skill": "CSS",           "weight": 6,  "cat": "Code",       "learn": "css-tricks.com"},
        {"skill": "HTML",          "weight": 5,  "cat": "Code",       "learn": "developer.mozilla.org"},
        {"skill": "Motion Design", "weight": 5,  "cat": "Visual",     "learn": "after-effects.com"},
        {"skill": "Accessibility", "weight": 7,  "cat": "Standards",  "learn": "w3.org/WAI"},
        {"skill": "Sketch",        "weight": 5,  "cat": "Tool",       "learn": "sketch.com"},
        {"skill": "Information Architecture","weight":6,"cat":"Core", "learn": "iainstitute.org"},
    ],

    "sales": [
        {"skill": "CRM",           "weight": 9,  "cat": "Tool",       "learn": "salesforce.com/trailhead"},
        {"skill": "Salesforce",    "weight": 8,  "cat": "Tool",       "learn": "salesforce.com/trailhead"},
        {"skill": "Cold Calling",  "weight": 8,  "cat": "Technique",  "learn": "hubspot.com/sales"},
        {"skill": "Negotiation",   "weight": 9,  "cat": "Soft Skill", "learn": "coursera.org"},
        {"skill": "Pipeline Mgmt", "weight": 8,  "cat": "Core",       "learn": "hubspot.com/sales"},
        {"skill": "Presentation",  "weight": 7,  "cat": "Soft Skill", "learn": "coursera.org"},
        {"skill": "Excel",         "weight": 7,  "cat": "Tool",       "learn": "microsoft.com/excel"},
        {"skill": "Lead Generation","weight":7,  "cat": "Core",       "learn": "hubspot.com"},
        {"skill": "Account Mgmt",  "weight": 7,  "cat": "Core",       "learn": "gainsight.com"},
        {"skill": "B2B Sales",     "weight": 7,  "cat": "Domain",     "learn": "gartner.com"},
        {"skill": "Communication", "weight": 9,  "cat": "Soft Skill", "learn": "coursera.org"},
        {"skill": "Objection Handling","weight":7,"cat":"Technique",  "learn": "hubspot.com/sales"},
        {"skill": "LinkedIn Sales","weight": 6,  "cat": "Digital",    "learn": "business.linkedin.com"},
        {"skill": "Forecasting",   "weight": 6,  "cat": "Analytics",  "learn": "hubspot.com"},
        {"skill": "Territory Mgmt","weight": 5,  "cat": "Strategy",   "learn": "coursera.org"},
    ],

    "hr": [
        {"skill": "Recruitment",   "weight": 10, "cat": "Core",       "learn": "shrm.org"},
        {"skill": "HRIS",          "weight": 8,  "cat": "Tool",       "learn": "workday.com"},
        {"skill": "Payroll",       "weight": 8,  "cat": "Core",       "learn": "adp.com"},
        {"skill": "Employee Relations","weight":8,"cat":"Core",       "learn": "shrm.org"},
        {"skill": "Labour Law",    "weight": 8,  "cat": "Compliance", "learn": "labour.gov.in"},
        {"skill": "Performance Mgmt","weight":7, "cat": "Core",       "learn": "shrm.org"},
        {"skill": "Onboarding",    "weight": 7,  "cat": "Core",       "learn": "shrm.org"},
        {"skill": "Excel",         "weight": 7,  "cat": "Tool",       "learn": "microsoft.com/excel"},
        {"skill": "Communication", "weight": 9,  "cat": "Soft Skill", "learn": "coursera.org"},
        {"skill": "Training & Dev","weight": 6,  "cat": "L&D",        "learn": "td.org"},
        {"skill": "Compensation",  "weight": 6,  "cat": "Core",       "learn": "worldatwork.org"},
        {"skill": "ATS Tools",     "weight": 7,  "cat": "Tool",       "learn": "lever.co"},
        {"skill": "Interviewing",  "weight": 8,  "cat": "Technique",  "learn": "shrm.org"},
        {"skill": "PF/ESI",        "weight": 7,  "cat": "Compliance", "learn": "epfindia.gov.in"},
        {"skill": "Org Development","weight":5,  "cat": "Strategy",   "learn": "odnetwork.org"},
    ],

    "marketing": [
        {"skill": "Digital Marketing","weight":9,"cat":"Core",        "learn": "google.com/skillshop"},
        {"skill": "SEO",           "weight": 8,  "cat": "Channel",    "learn": "moz.com/learn/seo"},
        {"skill": "Google Ads",    "weight": 8,  "cat": "Paid",       "learn": "skillshop.withgoogle.com"},
        {"skill": "Social Media",  "weight": 8,  "cat": "Channel",    "learn": "hubspot.com"},
        {"skill": "Content Writing","weight":7,  "cat": "Content",    "learn": "copyblogger.com"},
        {"skill": "Analytics",     "weight": 8,  "cat": "Data",       "learn": "analytics.google.com"},
        {"skill": "Email Marketing","weight":7,  "cat": "Channel",    "learn": "mailchimp.com"},
        {"skill": "Meta Ads",      "weight": 7,  "cat": "Paid",       "learn": "facebook.com/business"},
        {"skill": "Canva",         "weight": 6,  "cat": "Design",     "learn": "canva.com"},
        {"skill": "CRM",           "weight": 6,  "cat": "Tool",       "learn": "hubspot.com"},
        {"skill": "Copywriting",   "weight": 7,  "cat": "Content",    "learn": "copyhackers.com"},
        {"skill": "Brand Strategy","weight": 6,  "cat": "Strategy",   "learn": "coursera.org"},
        {"skill": "Market Research","weight":6,  "cat": "Research",   "learn": "coursera.org"},
        {"skill": "Excel",         "weight": 6,  "cat": "Tool",       "learn": "microsoft.com/excel"},
        {"skill": "Automation",    "weight": 5,  "cat": "Tool",       "learn": "zapier.com"},
    ],
}

# Alias map: normalise role title variations → canonical key
ROLE_ALIASES = {
    "software engineer": "fullstack",
    "software developer": "fullstack",
    "sde": "fullstack",
    "sde i": "backend",
    "sde ii": "backend",
    "sde-1": "backend",
    "sde-2": "backend",
    "backend developer": "backend",
    "backend engineer": "backend",
    "frontend developer": "frontend",
    "frontend engineer": "frontend",
    "react developer": "frontend",
    "ui developer": "frontend",
    "full stack": "fullstack",
    "full-stack": "fullstack",
    "data analyst": "data science",
    "data scientist": "data science",
    "business analyst": "data science",
    "ml engineer": "machine learning",
    "ai engineer": "machine learning",
    "deep learning": "machine learning",
    "devops engineer": "devops",
    "sre": "devops",
    "cloud engineer": "devops",
    "infrastructure": "devops",
    "android developer": "mobile",
    "ios developer": "mobile",
    "mobile developer": "mobile",
    "flutter developer": "mobile",
    "product manager": "product manager",
    "product owner": "product manager",
    "ux designer": "ui/ux designer",
    "ui designer": "ui/ux designer",
    "design": "ui/ux designer",
    "sales executive": "sales",
    "business development": "sales",
    "account manager": "sales",
    "hr executive": "hr",
    "talent acquisition": "hr",
    "recruiter": "hr",
    "human resources": "hr",
    "digital marketer": "marketing",
    "content marketer": "marketing",
    "growth marketer": "marketing",
    "seo specialist": "marketing",
}


def resolve_role(title: str) -> Optional[str]:
    """Map a job title to a canonical role key."""
    if not title:
        return None
    t = title.lower().strip()
    if t in ROLE_SKILLS:
        return t
    if t in ROLE_ALIASES:
        return ROLE_ALIASES[t]
    for alias, canonical in ROLE_ALIASES.items():
        if alias in t:
            return canonical
    for canonical in ROLE_SKILLS:
        if canonical in t:
            return canonical
    return None


def compute_skill_gap(
    user_skills: List[str],
    role_key: str,
    job_descriptions: List[str],
    top_n_from_jds: int = 40,
) -> Dict:
    """
    Core radar computation.

    Returns:
        role_key, role_skills_with_status, gap_score, match_score,
        priority_gaps (sorted by impact), strengths, radar_data (for Chart.js)
    """
    role_skills = ROLE_SKILLS.get(role_key, [])
    user_skill_set = {s.lower().strip() for s in user_skills}

    # Also extract keyword frequency from real JDs if provided
    jd_freq: Counter = Counter()
    for jd in job_descriptions:
        words = re.findall(r"[a-zA-Z0-9#+.\-]{2,}", jd)
        for w in words:
            jd_freq[w.lower()] += 1

    total_jds = max(len(job_descriptions), 1)

    skills_with_status = []
    for sk in role_skills:
        name_lower = sk["skill"].lower()
        # Check if user has it
        has_it = any(
            name_lower in us or us in name_lower
            for us in user_skill_set
        )
        # JD frequency: how often does this skill appear in actual listings?
        jd_hits = sum(
            v for k, v in jd_freq.items()
            if name_lower in k or k in name_lower
        )
        jd_pct = min(100, round(jd_hits / total_jds * 100)) if job_descriptions else sk["weight"] * 10

        skills_with_status.append({
            **sk,
            "has":      has_it,
            "jd_pct":   jd_pct,        # % of real JDs that mention this skill
            "gap_size": sk["weight"] * (1 - int(has_it)),  # 0 if user has it
            "impact":   sk["weight"],
        })

    # Sort: gaps first (by weight desc), then matched
    gaps     = [s for s in skills_with_status if not s["has"]]
    matched  = [s for s in skills_with_status if s["has"]]
    gaps.sort(key=lambda x: -x["weight"])
    matched.sort(key=lambda x: -x["weight"])

    total_weight  = sum(s["weight"] for s in role_skills)
    matched_weight = sum(s["weight"] for s in matched)
    match_pct     = round(matched_weight / total_weight * 100) if total_weight else 0
    gap_pct       = 100 - match_pct

    # Radar chart data: group by category, avg match % per category
    cat_totals: Dict[str, Dict] = {}
    for s in skills_with_status:
        cat = s["cat"]
        if cat not in cat_totals:
            cat_totals[cat] = {"weight": 0, "matched": 0}
        cat_totals[cat]["weight"]  += s["weight"]
        cat_totals[cat]["matched"] += s["weight"] if s["has"] else 0

    radar_labels = list(cat_totals.keys())
    radar_values = [
        round(cat_totals[c]["matched"] / cat_totals[c]["weight"] * 100)
        if cat_totals[c]["weight"] else 0
        for c in radar_labels
    ]

    # Learning path: top 5 gaps by weight, with free resource
    learning_path = [
        {
            "skill":   s["skill"],
            "impact":  s["weight"],
            "jd_pct":  s["jd_pct"],
            "learn":   s.get("learn", ""),
            "cat":     s["cat"],
        }
        for s in gaps[:5]
    ]

    return {
        "role":          role_key,
        "match_pct":     match_pct,
        "gap_pct":       gap_pct,
        "total_skills":  len(role_skills),
        "skills_matched": len(matched),
        "skills_missing": len(gaps),
        "all_skills":    skills_with_status,
        "gaps":          gaps,
        "strengths":     matched,
        "learning_path": learning_path,
        "radar": {
            "labels": radar_labels,
            "values": radar_values,
        },
        "jds_analysed":  total_jds,
    }
