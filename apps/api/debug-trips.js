const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTrips() {
  console.log('🔍 Debugging trips for user "explorer1"...\n');
  
  try {
    // 1. Check if user exists
    const user = await prisma.user.findUnique({
      where: { username: 'explorer1' },
      select: { id: true, username: true, role: true }
    });
    
    if (!user) {
      console.log('❌ User "explorer1" not found!');
      return;
    }
    
    console.log('✅ User found:', user);
    console.log('');
    
    // 2. Get ALL trips for this user (including private and soft-deleted)
    const allTrips = await prisma.trip.findMany({
      where: {
        author: { username: 'explorer1' }
      },
      select: {
        id: true,
        public_id: true,
        title: true,
        public: true,
        deleted_at: true,
        created_at: true,
        waypoints: {
          select: {
            waypoint: {
              select: {
                id: true,
                title: true,
                lat: true,
                lon: true,
                deleted_at: true,
                created_at: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    
    console.log(`📊 Total trips found for explorer1: ${allTrips.length}\n`);
    
    if (allTrips.length === 0) {
      console.log('❌ No trips found for explorer1!');
      return;
    }
    
    // 3. Analyze each trip
    allTrips.forEach((trip, index) => {
      const activeWaypoints = trip.waypoints.filter(tw => tw.waypoint.deleted_at === null);
      const deletedWaypoints = trip.waypoints.filter(tw => tw.waypoint.deleted_at !== null);
      
      console.log(`🚗 Trip ${index + 1}:`);
      console.log(`   ID: ${trip.id} (public_id: ${trip.public_id})`);
      console.log(`   Title: "${trip.title}"`);
      console.log(`   Public: ${trip.public}`);
      console.log(`   Deleted: ${trip.deleted_at ? 'YES (' + trip.deleted_at + ')' : 'NO'}`);
      console.log(`   Created: ${trip.created_at}`);
      console.log(`   Active Waypoints: ${activeWaypoints.length}`);
      console.log(`   Deleted Waypoints: ${deletedWaypoints.length}`);
      
      if (activeWaypoints.length > 0) {
        console.log(`   📍 Active Waypoints:`);
        activeWaypoints.forEach((tw, i) => {
          console.log(`      ${i + 1}. "${tw.waypoint.title}" (${tw.waypoint.lat}, ${tw.waypoint.lon})`);
        });
      }
      
      if (deletedWaypoints.length > 0) {
        console.log(`   🗑️ Deleted Waypoints:`);
        deletedWaypoints.forEach((tw, i) => {
          console.log(`      ${i + 1}. "${tw.waypoint.title}" (deleted: ${tw.waypoint.deleted_at})`);
        });
      }
      console.log('');
    });
    
    // 4. Test the exact API query conditions
    console.log('🔬 Testing API query conditions...\n');
    
    const apiTrips = await prisma.trip.findMany({
      where: {
        author: { username: 'explorer1' },
        public: true,
        deleted_at: null,
      },
      select: {
        public_id: true,
        title: true,
        waypoints: {
          where: {
            waypoint: {
              deleted_at: null,
            },
          },
          select: {
            waypoint: {
              select: {
                id: true,
                title: true,
                lat: true,
                lon: true,
                date: true,
              },
            },
          },
        },
      },
      orderBy: [{ id: 'desc' }],
    });
    
    console.log(`📈 Trips matching API query: ${apiTrips.length}`);
    
    apiTrips.forEach((trip, index) => {
      console.log(`   ${index + 1}. "${trip.title}" - ${trip.waypoints.length} waypoints`);
      
      // This is the filter that removes trips from the API response!
      const wouldBeFiltered = trip.waypoints.length <= 1;
      console.log(`      ⚠️ Would be filtered out by API: ${wouldBeFiltered ? 'YES' : 'NO'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTrips();