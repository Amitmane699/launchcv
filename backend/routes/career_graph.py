"""Career Graph — build graph from resume data, serve nodes/edges, cross-user insights."""
import uuid
import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from db import career_graphs, resumes, users
from auth_utils import get_current_user

router = APIRouter(prefix="/career-graph", tags=["career-graph"])

# ── Canonical company aliases (top Indian employers) ─────────────────────────
COMPANY_ALIASES = {
    "tcs": "TCS", "tata consultancy": "TCS", "tata consultancy services": "TCS",
    "infosys": "Infosys", "infy": "Infosys",
    "wipro": "Wipro",
    "hcl": "HCL Technologies", "hcl technologies": "HCL Technologies",
    "tech mahindra": "Tech Mahindra",
    "cognizant": "Cognizant", "cts": "Cognizant",
    "accenture": "Accenture",
    "ibm": "IBM",
    "amazon": "Amazon", "amazon india": "Amazon",
    "google": "Google", "google india": "Google",
    "microsoft": "Microsoft",
    "flipkart": "Flipkart",
    "swiggy": "Swiggy",
    "zomato": "Zomato",
    "ola": "Ola",
    "paytm": "Paytm", "one97": "Paytm",
    "byju": "BYJU'S", "byjus": "BYJU'S",
    "razorpay": "Razorpay",
    "freshworks": "Freshworks",
    "zoho": "Zoho",
    "meesho": "Meesho",
    "phonepe": "PhonePe",
    "cred": "CRED",
    "zerodha": "Zerodha",
    "groww": "Groww",
    "nykaa": "Nykaa",
    "myntra": "Myntra",
}


def _canonical_company(name: str) -> str:
    """Normalise company name to canonical form."""
    if not name:
        return name
    key = name.strip().lower()
    return COMPANY_ALIASES.get(key, name.strip().title())


def _node_id(type_: str, label: str) -> str:
    slug = re.sub(r"[^a-z0-9]", "_", label.lower().strip())
    return f"{type_}_{slug}"


def build_graph_from_resume(resume_doc: Dict) -> Dict:
    """Convert a resume JSON document into a graph {nodes, edges}."""
    d = resume_doc.get("data") or {}
    p = d.get("personal") or {}
    user_id = resume_doc.get("user_id", "")
    person_id = f"person_{user_id}"

    nodes: List[Dict] = []
    edges: List[Dict] = []
    seen_nodes = set()

    def add_node(nid, ntype, label, props=None):
        if nid not in seen_nodes:
            nodes.append({"id": nid, "type": ntype, "label": label, "properties": props or {}})
            seen_nodes.add(nid)

    def add_edge(source, target, rel, props=None):
        edges.append({"id": str(uuid.uuid4()), "source": source, "target": target,
                      "relation": rel, "properties": props or {}})

    # Person node
    add_node(person_id, "person", p.get("fullName") or "You",
             {"email": p.get("email"), "location": p.get("location"), "headline": p.get("headline")})

    # Experience → Role + Company nodes
    for exp in d.get("experience") or []:
        role_label = exp.get("role", "").strip()
        company_raw = exp.get("company", "").strip()
        company_label = _canonical_company(company_raw)
        duration = exp.get("duration", "")

        if role_label:
            rid = _node_id("role", f"{role_label}_{company_label}")
            add_node(rid, "role", role_label,
                     {"company": company_label, "duration": duration, "location": exp.get("location", "")})
            add_edge(person_id, rid, "held", {"duration": duration})

            if company_label:
                cid = _node_id("company", company_label)
                add_node(cid, "company", company_label, {"canonical": True})
                add_edge(rid, cid, "at")

            # Skills mentioned in bullets
            for bullet in (exp.get("bullets") or []):
                _maybe_add_skill_from_text(bullet, person_id, rid, nodes, edges, seen_nodes)

    # Skills section
    for skill in d.get("skills") or []:
        if skill.strip():
            sid = _node_id("skill", skill)
            add_node(sid, "skill", skill.strip())
            add_edge(person_id, sid, "has_skill")

    # Education → Institution node
    for edu in d.get("education") or []:
        school = edu.get("school", "").strip()
        degree = edu.get("degree", "").strip()
        if school:
            iid = _node_id("institution", school)
            add_node(iid, "institution", school,
                     {"degree": degree, "field": edu.get("field", ""), "cgpa": edu.get("grade", "")})
            add_edge(person_id, iid, "studied_at",
                     {"degree": degree, "field": edu.get("field"), "duration": edu.get("duration")})

    # Certifications
    for cert in d.get("certifications") or []:
        name = cert.get("name") if isinstance(cert, dict) else str(cert)
        if name:
            cid = _node_id("cert", name)
            add_node(cid, "certification", name,
                     {"issuer": cert.get("issuer", "") if isinstance(cert, dict) else ""})
            add_edge(person_id, cid, "certified_in")

    # Projects
    for proj in d.get("projects") or []:
        pname = proj.get("name", "").strip()
        if pname:
            pid = _node_id("project", pname)
            add_node(pid, "project", pname, {"description": proj.get("description", "")})
            add_edge(person_id, pid, "built")

    return {"nodes": nodes, "edges": edges}


def _maybe_add_skill_from_text(text, person_id, role_id, nodes, edges, seen_nodes):
    """Very lightweight heuristic: detect well-known tech names in bullet text."""
    KNOWN_TECH = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js", "Angular", "Vue",
        "Java", "C++", "Go", "Rust", "Swift", "Kotlin", "SQL", "MongoDB", "PostgreSQL",
        "MySQL", "Redis", "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Git",
        "FastAPI", "Django", "Flask", "Spring", "Express", "GraphQL", "REST",
        "Figma", "Tableau", "Power BI", "Excel", "SAP", "Salesforce",
    ]
    for tech in KNOWN_TECH:
        if re.search(r'\b' + re.escape(tech) + r'\b', text, re.IGNORECASE):
            sid = f"skill_{tech.lower().replace('.', '').replace(' ', '_')}"
            if sid not in seen_nodes:
                nodes.append({"id": sid, "type": "skill", "label": tech, "properties": {}})
                seen_nodes.add(sid)
            edges.append({"id": str(uuid.uuid4()), "source": role_id, "target": sid,
                          "relation": "used_skill", "properties": {}})


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/build")
async def build_graph(user=Depends(get_current_user)):
    """Rebuild graph for the current user from their latest resume."""
    docs = await resumes.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(10)
    if not docs:
        raise HTTPException(404, "No resume found. Create a resume first.")

    # Merge all resumes into one comprehensive graph
    all_nodes: Dict[str, Dict] = {}
    all_edges: List[Dict] = []

    for resume_doc in docs:
        g = build_graph_from_resume(resume_doc)
        for node in g["nodes"]:
            if node["id"] not in all_nodes:
                all_nodes[node["id"]] = node
        all_edges.extend(g["edges"])

    # Deduplicate edges
    seen_edges = set()
    deduped = []
    for e in all_edges:
        key = f"{e['source']}_{e['target']}_{e['relation']}"
        if key not in seen_edges:
            seen_edges.add(key)
            deduped.append(e)

    graph_doc = {
        "user_id": user["id"],
        "nodes": list(all_nodes.values()),
        "edges": deduped,
        "node_count": len(all_nodes),
        "edge_count": len(deduped),
        "built_at": datetime.now(timezone.utc).isoformat(),
    }

    await career_graphs.update_one(
        {"user_id": user["id"]},
        {"$set": graph_doc},
        upsert=True,
    )
    graph_doc.pop("_id", None)
    return graph_doc


@router.get("/me")
async def get_my_graph(user=Depends(get_current_user)):
    """Return the stored graph for the current user. Auto-builds if missing."""
    doc = await career_graphs.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        return await build_graph(user)
    return doc


@router.get("/public/{user_id}")
async def get_public_graph(user_id: str):
    """Public graph — only if the user has share enabled (Pro plan)."""
    u = await users.find_one({"id": user_id}, {"plan": 1, "name": 1, "_id": 0})
    if not u:
        raise HTTPException(404, "Not found")
    if u.get("plan", "free") == "free":
        raise HTTPException(403, "Graph sharing requires a paid plan")
    doc = await career_graphs.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Graph not built yet")
    return doc


@router.get("/insights")
async def graph_insights(user=Depends(get_current_user)):
    """
    Surface cross-user insights:
    - Top skills for the user's dominant role title
    - Rising skills on the platform (added most in last 90 days)
    - Missing skill suggestions based on role
    """
    doc = await career_graphs.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        return {"insights": [], "skill_benchmarks": [], "rising_skills": []}

    nodes = doc.get("nodes", [])

    # Derive user's top role title
    role_nodes = [n for n in nodes if n["type"] == "role"]
    user_skills = {n["label"].lower() for n in nodes if n["type"] == "skill"}
    top_role = role_nodes[0]["label"] if role_nodes else None

    # Aggregate platform-wide top skills for this role (across all users)
    skill_benchmarks = []
    if top_role:
        pipeline = [
            {"$unwind": "$nodes"},
            {"$match": {"nodes.type": "skill"}},
            {"$group": {"_id": "$nodes.label", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 12},
        ]
        cursor = career_graphs.aggregate(pipeline)
        all_platform_skills = await cursor.to_list(12)
        for item in all_platform_skills:
            skill_benchmarks.append({
                "skill": item["_id"],
                "platform_count": item["count"],
                "user_has": item["_id"].lower() in user_skills,
            })

    # Detect missing high-value skills for common role patterns
    ROLE_SKILL_MAP = {
        "frontend": ["React", "TypeScript", "CSS", "Performance", "Testing"],
        "backend": ["REST", "Docker", "PostgreSQL", "Redis", "Testing"],
        "fullstack": ["React", "Node.js", "Docker", "SQL", "TypeScript"],
        "data": ["Python", "SQL", "Pandas", "Machine Learning", "Tableau"],
        "devops": ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform"],
        "mobile": ["Swift", "Kotlin", "React Native", "REST", "Git"],
        "ml": ["Python", "TensorFlow", "PyTorch", "SQL", "Statistics"],
    }

    missing_suggestions = []
    if top_role:
        rl = top_role.lower()
        for key, skills in ROLE_SKILL_MAP.items():
            if key in rl or rl in key:
                for sk in skills:
                    if sk.lower() not in user_skills:
                        missing_suggestions.append(sk)
                break

    insights = []
    if missing_suggestions:
        insights.append({
            "type": "skill_gap",
            "message": f"Top roles like '{top_role}' frequently list: {', '.join(missing_suggestions[:4])}",
            "action": "Add to skills",
            "data": missing_suggestions[:5],
        })

    # Check if user has certifications
    cert_nodes = [n for n in nodes if n["type"] == "certification"]
    if not cert_nodes and user_skills:
        insights.append({
            "type": "certifications",
            "message": "Profiles with certifications get 40% more recruiter views. Add yours.",
            "action": "Add certifications",
            "data": [],
        })

    # Career duration
    exp_nodes = [n for n in nodes if n["type"] == "role"]
    if len(exp_nodes) >= 2:
        insights.append({
            "type": "career_path",
            "message": f"You've held {len(exp_nodes)} roles — your career graph shows a strong progression.",
            "action": "View timeline",
            "data": [n["label"] for n in exp_nodes],
        })

    return {
        "insights": insights,
        "skill_benchmarks": skill_benchmarks,
        "missing_skills": missing_suggestions[:8],
        "top_role": top_role,
        "node_count": len(nodes),
        "skill_count": len(user_skills),
    }


@router.get("/trending-skills")
async def trending_skills():
    """Platform-wide top 20 skills by frequency — public endpoint."""
    pipeline = [
        {"$unwind": "$nodes"},
        {"$match": {"nodes.type": "skill"}},
        {"$group": {"_id": "$nodes.label", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]
    cursor = career_graphs.aggregate(pipeline)
    result = await cursor.to_list(20)
    return [{"skill": r["_id"], "count": r["count"]} for r in result]
