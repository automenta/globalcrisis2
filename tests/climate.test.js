import { ClimateGrid } from '../src/climate.js';

describe('ClimateGrid Seasonal Cycle', () => {
  let climateGrid;

  beforeEach(() => {
    climateGrid = new ClimateGrid();
  });

  it('should have different temperatures in summer and winter for the northern hemisphere', () => {
    const northernLat = 45;
    const lon = 0;

    // Time: Start of the year (Winter in Northern Hemisphere)
    climateGrid.simulationTime = 0;
    const winterTemp = climateGrid.getDataAt(northernLat, lon).temperature;

    // Time: Half a year later (Summer in Northern Hemisphere)
    climateGrid.simulationTime = climateGrid.yearDuration / 2;
    const summerTemp = climateGrid.getDataAt(northernLat, lon).temperature;

    // Expect summer to be significantly warmer than winter
    expect(summerTemp).to.be.greaterThan(winterTemp);
    expect(summerTemp - winterTemp).to.be.greaterThan(10); // Expect a significant difference
  });

  it('should have opposite seasons in northern and southern hemispheres', () => {
    const northernLat = 45;
    const southernLat = -45;
    const lon = 0;

    // Time: A quarter year in (peak of Northern Summer)
    climateGrid.simulationTime = climateGrid.yearDuration / 4;

    const northernSummerTemp = climateGrid.getDataAt(northernLat, lon).temperature;
    const southernWinterTemp = climateGrid.getDataAt(southernLat, lon).temperature;

    // Expect northern hemisphere to be warmer than southern at this time
    expect(northernSummerTemp).to.be.greaterThan(southernWinterTemp);
  });

  it('should have minimal seasonal temperature change at the equator', () => {
    const equatorialLat = 0;
    const lon = 0;

    // Time: Start of the year
    climateGrid.simulationTime = 0;
    const temp1 = climateGrid.getDataAt(equatorialLat, lon).temperature;

    // Time: Half a year later
    climateGrid.simulationTime = climateGrid.yearDuration / 2;
    const temp2 = climateGrid.getDataAt(equatorialLat, lon).temperature;

    // Expect temperatures to be very close
    expect(temp1).to.be.closeTo(temp2, 1); // Use toBeCloseTo for floating point comparison
  });
});
