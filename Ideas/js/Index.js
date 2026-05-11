const nicheData = {
  faceless: {
    name: 'Faceless content',
    reason: 'No camera needed. Pure automation with AI voiceover, stock footage, and generated visuals. Scales easily to multiple channels.',
    time: '2-4 hrs',
    cost: '$50-100',
    skill: 'Beginner'
  },
  tutorials: {
    name: 'AI tutorials',
    reason: 'Growing demand. You can use AI to create the tutorials about AI. Meta content works well. Easy to monetize with courses.',
    time: '3-5 hrs',
    cost: '$30-80',
    skill: 'Beginner'
  },
  stories: {
    name: 'Story channels',
    reason: 'Highly engaging. True crime, history, mysteries get millions of views. AI writes and narrates, you add visuals.',
    time: '2-3 hrs',
    cost: '$40-90',
    skill: 'Beginner'
  },
  finance: {
    name: 'Finance explained',
    reason: 'High CPM ($15-25). Affiliate opportunities. AI explains complex topics simply. Growing demand for financial literacy.',
    time: '3-4 hrs',
    cost: '$50-100',
    skill: 'Intermediate'
  },
  productivity: {
    name: 'Productivity',
    reason: 'Evergreen content. Tool reviews = affiliate income. Screen recordings + AI voiceover = fast production.',
    time: '2-4 hrs',
    cost: '$40-70',
    skill: 'Beginner'
  },
  history: {
    name: 'History stories',
    reason: 'Endless content ideas. High retention. AI generates scripts from historical events. Public domain images available.',
    time: '3-4 hrs',
    cost: '$30-60',
    skill: 'Beginner'
  }
};

function selectNiche(niche) {
  const data = nicheData[niche];
  document.getElementById('nicheDetails').style.display = 'block';
  document.getElementById('selectedNiche').textContent = data.name;
  document.getElementById('nicheReason').textContent = data.reason;
  document.getElementById('prodTime').textContent = data.time;
  document.getElementById('startCost').textContent = data.cost;
  document.getElementById('skillLevel').textContent = data.skill;
  
  document.getElementById('nicheDetails').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateRevenue() {
  const videos = parseInt(document.getElementById('videoSlider').value);
  const views = parseInt(document.getElementById('viewSlider').value);
  const cpm = parseFloat(document.getElementById('cpmSlider').value);
  
  document.getElementById('videoCount').textContent = videos;
  document.getElementById('viewCount').textContent = views.toLocaleString();
  document.getElementById('cpmValue').textContent = '$' + cpm.toFixed(2);
  
  const totalViews = videos * views;
  const adRev = Math.round((totalViews / 1000) * cpm);
  const affiliateEst = Math.round(videos * views * 0.005);
  const total = adRev + affiliateEst;
  
  document.getElementById('adRevenue').textContent = '$' + adRev.toLocaleString();
  document.getElementById('affiliateRevenue').textContent = '$' + affiliateEst.toLocaleString();
  document.getElementById('totalMonthly').textContent = '$' + total.toLocaleString();
  document.getElementById('totalRevenue').textContent = '$' + total.toLocaleString();
}

document.getElementById('videoSlider').addEventListener('input', updateRevenue);
document.getElementById('viewSlider').addEventListener('input', updateRevenue);
document.getElementById('cpmSlider').addEventListener('input', updateRevenue);

updateRevenue();