import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BasicMapInitializationComponent } from '../../src/app/scenarios/basic-map-initialization/basic-map-initialization.component';
import { SitnaConfigService } from '../../src/app/services/sitna-config.service';
import type { TestMetadata } from './shared/test-metadata.types';



describe('BasicMapInitializationComponent', () => {
  let component: BasicMapInitializationComponent;
  let fixture: ComponentFixture<BasicMapInitializationComponent>;
  let configService: SitnaConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BasicMapInitializationComponent],
      providers: [SitnaConfigService],
    }).compileComponents();

    fixture = TestBed.createComponent(BasicMapInitializationComponent);
    component = fixture.componentInstance;
    configService = TestBed.inject(SitnaConfigService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize map on init', (done) => {
    jest.useFakeTimers();
    jest.spyOn(configService, 'initializeMap').mockReturnValue(null);
    component.ngOnInit();
    jest.advanceTimersByTime(100);
    expect(configService.initializeMap).toHaveBeenCalled();
    jest.useRealTimers();
    done();
  });

  it('should destroy map on destroy', () => {
    component.map = {} as any;
    component.ngOnDestroy();
    expect(component.map).toBeNull();
  });
});

