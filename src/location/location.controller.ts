import { Controller, Get, Param } from '@nestjs/common';
import { LocationService } from './location.service';

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('states')
  getStates() {
    return this.locationService.getStates();
  }

  @Get('states/:stateId/districts')
  getDistricts(@Param('stateId') stateId: string) {
    return this.locationService.getDistricts(stateId);
  }
}
