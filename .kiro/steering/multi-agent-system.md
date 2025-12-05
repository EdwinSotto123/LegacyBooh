# Multi-Agent Ghost System

## Overview
Code Necromancer implements a multi-agent architecture where 6 specialized ghost programmers collaborate to analyze and migrate legacy code. Each ghost has unique expertise, personality, and voice.

## Ghost Agents

### 🏛️ Adrian "The Architect"
- **Role**: Senior Backend Engineer
- **Specialty**: Design Patterns & Architecture
- **Death Cause**: Cardiac arrest waiting for PR approval
- **Voice**: Male (Puck)
- **Expertise**: SOLID principles, microservices, clean architecture

### 💀 Marcus "The Hacker"
- **Role**: Security Consultant
- **Specialty**: Security & Performance
- **Death Cause**: Caffeine overdose during 72-hour CTF
- **Voice**: Male (Puck)
- **Expertise**: Vulnerabilities, optimization, penetration testing

### 🖥️ Beatrice "Root"
- **Role**: SysAdmin / DevOps
- **Specialty**: Infrastructure & Deployment
- **Death Cause**: Untangling recursive symlink in server fire
- **Voice**: Female (Aoede)
- **Expertise**: CI/CD, containers, cloud infrastructure

### 🔮 Elena "The Oracle"
- **Role**: Data Scientist / ML Engineer
- **Specialty**: Data & Machine Learning
- **Death Cause**: Lost in infinite hyperparameter tuning loop
- **Voice**: Female (Aoede)
- **Expertise**: ML models, data pipelines, analytics

### 📟 Carlos "Legacy"
- **Role**: COBOL Maintainer
- **Specialty**: Legacy Systems & Mainframes
- **Death Cause**: Y2K bug caught up in 2038
- **Voice**: Male (Puck)
- **Expertise**: COBOL, mainframes, ancient systems

### 🐛 Sofia "The Debugger"
- **Role**: QA Lead / Test Engineer
- **Specialty**: Testing & Quality Assurance
- **Death Cause**: Found production bug no one believed existed
- **Voice**: Female (Aoede)
- **Expertise**: Testing strategies, bug hunting, QA processes

## Agent Selection Logic

```typescript
// User selects ghost based on their needs:
// - Architecture review → Adrian
// - Security audit → Marcus
// - DevOps help → Beatrice
// - ML/Data questions → Elena
// - Legacy migration → Carlos
// - Bug hunting → Sofia
```

## Agent Personality System

Each ghost has:
1. **Unique system prompt** with their backstory
2. **Specialized knowledge** for their domain
3. **Sarcastic personality** referencing their death
4. **Defensive attitude** about their legacy code

## Voice Configuration

```typescript
const getVoiceName = () => 
    currentPersonaGender === 'female' ? 'Aoede' : 'Puck';
```

## Future: Multi-Agent Collaboration

Planned feature: Multiple ghosts discussing code together
- Adrian reviews architecture
- Marcus checks security
- Sofia finds bugs
- All argue sarcastically about the best approach
