import svgwrite
from datetime import datetime

class LogRenderer:
    def __init__(self, log_date, duty_events, trip=None):
        self.log_date = log_date
        self.duty_events = duty_events
        self.trip = trip
        self.dwg = svgwrite.Drawing(size=('1000px', '800px'))
        
        self.grid_x = 100
        self.grid_y = 250
        self.row_height = 40
        self.hour_width = 30
        self.total_width = 24 * self.hour_width
        
    def render(self):
        self._draw_headers()
        self._draw_grid()
        self._plot_events()
        self._draw_footer()
        return self.dwg.tostring()

    def _draw_headers(self):
        # Title
        self.dwg.add(self.dwg.text('Drivers Daily Log', insert=(50, 50), font_size='24px', font_weight='bold'))
        self.dwg.add(self.dwg.text(f"(24 hours)      {self.log_date.strftime('%m / %d / %Y')}", insert=(50, 70), font_size='14px'))
        
        # From To
        self.dwg.add(self.dwg.text('From:', insert=(50, 100), font_size='14px', font_weight='bold'))
        self.dwg.add(self.dwg.line((100, 100), (400, 100), stroke='black'))
        self.dwg.add(self.dwg.text('To:', insert=(450, 100), font_size='14px', font_weight='bold'))
        self.dwg.add(self.dwg.line((480, 100), (800, 100), stroke='black'))
        
        # Boxes
        self.dwg.add(self.dwg.rect((50, 120), (150, 30), fill='none', stroke='black'))
        self.dwg.add(self.dwg.text('Total Miles Driving Today', insert=(55, 165), font_size='10px'))
        driving_miles = f"{sum([e.distance_miles for e in self.duty_events if e.status == 'DRIVING']):.1f}"
        self.dwg.add(self.dwg.text(driving_miles, insert=(100, 140), font_size='12px', font_weight='bold'))
        
        self.dwg.add(self.dwg.rect((210, 120), (150, 30), fill='none', stroke='black'))
        self.dwg.add(self.dwg.text('Total Mileage Today', insert=(235, 165), font_size='10px'))
        total_miles = f"{sum([e.distance_miles for e in self.duty_events]):.1f}"
        self.dwg.add(self.dwg.text(total_miles, insert=(270, 140), font_size='12px', font_weight='bold'))
        
        self.dwg.add(self.dwg.rect((50, 180), (310, 30), fill='none', stroke='black'))
        self.dwg.add(self.dwg.text('Truck/Tractor and Trailer Numbers', insert=(100, 225), font_size='10px'))
        if self.trip and self.trip.truck_number:
            self.dwg.add(self.dwg.text(self.trip.truck_number, insert=(100, 200), font_size='12px', font_weight='bold'))
        
        # Carrier Info
        self.dwg.add(self.dwg.line((400, 140), (850, 140), stroke='black'))
        self.dwg.add(self.dwg.text('Name of Carrier or Carriers', insert=(550, 155), font_size='10px'))
        if self.trip and self.trip.carrier_name:
            self.dwg.add(self.dwg.text(self.trip.carrier_name, insert=(410, 135), font_size='14px', font_weight='bold'))
        
        self.dwg.add(self.dwg.line((400, 175), (850, 175), stroke='black'))
        self.dwg.add(self.dwg.text('Main Office Address', insert=(570, 190), font_size='10px'))
        if self.trip and self.trip.main_office_address:
            self.dwg.add(self.dwg.text(self.trip.main_office_address, insert=(410, 170), font_size='12px', font_weight='bold'))
        
        self.dwg.add(self.dwg.line((400, 210), (850, 210), stroke='black'))
        self.dwg.add(self.dwg.text('Home Terminal Address', insert=(560, 225), font_size='10px'))
        if self.trip and self.trip.home_terminal_address:
            self.dwg.add(self.dwg.text(self.trip.home_terminal_address, insert=(410, 205), font_size='12px', font_weight='bold'))

    def _draw_grid(self):
        # Header strip
        self.dwg.add(self.dwg.rect((self.grid_x, self.grid_y - 25), (self.total_width, 25), fill='black'))
        
        # Draw hours texts
        for h in range(24):
            x = self.grid_x + h * self.hour_width
            hour_str = str(h) if h > 0 and h != 12 else ('Mid' if h == 0 else 'Noon')
            self.dwg.add(self.dwg.text(hour_str, insert=(x, self.grid_y - 5), font_size='12px', fill='white'))

        labels = ['1. Off Duty', '2. Sleeper Berth', '3. Driving', '4. On Duty']
        
        for i in range(4):
            y = self.grid_y + i * self.row_height
            # Label
            if i == 3:
                self.dwg.add(self.dwg.text(labels[i], insert=(10, y + 18), font_size='12px'))
                self.dwg.add(self.dwg.text('(not driving)', insert=(22, y + 32), font_size='10px'))
            else:
                self.dwg.add(self.dwg.text(labels[i], insert=(10, y + 25), font_size='12px'))
            
            # Row rect
            self.dwg.add(self.dwg.rect((self.grid_x, y), (self.total_width, self.row_height), fill='none', stroke='black'))
            
            # Total hours line at the end
            self.dwg.add(self.dwg.line((self.grid_x + self.total_width + 10, y + 25), (self.grid_x + self.total_width + 50, y + 25), stroke='black'))

        # Draw vertical hour and half-hour/quarter-hour lines
        for i in range(4):
            y = self.grid_y + i * self.row_height
            for m in range(24 * 4): # 15 min increments
                x = self.grid_x + m * (self.hour_width / 4)
                line_len = self.row_height
                if m % 4 == 0:
                    line_len = self.row_height # full hour
                elif m % 2 == 0:
                    line_len = self.row_height / 2 # half hour
                else:
                    line_len = self.row_height / 4 # quarter hour
                self.dwg.add(self.dwg.line((x, y), (x, y + line_len), stroke='black', stroke_width='0.5'))

    def _plot_events(self):
        status_to_row = {
            'OFF_DUTY': 0,
            'SLEEPER_BERTH': 1,
            'DRIVING': 2,
            'ON_DUTY_NOT_DRIVING': 3
        }

        prev_x = self.grid_x
        prev_y = self.grid_y + status_to_row.get(self.duty_events[0].status, 0) * self.row_height + self.row_height / 2

        path_data = [f"M {prev_x},{prev_y}"]

        for event in self.duty_events:
            row_idx = status_to_row.get(event.status, 0)
            y = self.grid_y + row_idx * self.row_height + self.row_height / 2
            
            # Start of day vs start of event
            start_hour = event.start_time.hour + event.start_time.minute / 60.0
            end_hour = event.end_time.hour + event.end_time.minute / 60.0
            if end_hour == 0 and event.end_time > event.start_time:
                end_hour = 24.0
            
            if start_hour == 0 and prev_x == self.grid_x:
                prev_y = y # initial point
                path_data[0] = f"M {self.grid_x},{y}"

            start_x = self.grid_x + start_hour * self.hour_width
            end_x = self.grid_x + end_hour * self.hour_width

            if prev_x != start_x:
                # Gap in events, just move to the new start
                path_data.append(f"M {start_x},{prev_y}")
            
            if prev_y != y:
                # Vertical line from prev_y to y at the current x
                path_data.append(f"V {y}")
            
            # Horizontal line
            path_data.append(f"H {end_x}")
            
            prev_x = end_x
            prev_y = y

        self.dwg.add(self.dwg.path(d=" ".join(path_data), fill='none', stroke='red', stroke_width=3))

    def _draw_footer(self):
        # Remarks
        self.dwg.add(self.dwg.text('Remarks', insert=(50, 440), font_size='16px', font_weight='bold'))
        
        self.dwg.add(self.dwg.line((40, 460), (40, 600), stroke='black', stroke_width=3))
        
        self.dwg.add(self.dwg.text('Shipping Documents:', insert=(50, 500), font_size='12px', font_weight='bold'))
        self.dwg.add(self.dwg.line((50, 540), (180, 540), stroke='black'))
        self.dwg.add(self.dwg.text('DVL or Manifest No.', insert=(50, 555), font_size='10px'))
        self.dwg.add(self.dwg.line((50, 590), (180, 590), stroke='black'))
        self.dwg.add(self.dwg.text('Shipper & Commodity', insert=(50, 605), font_size='10px'))
        
        # Recap section (Simplified)
        self.dwg.add(self.dwg.text('Recap:', insert=(50, 650), font_size='12px'))
        self.dwg.add(self.dwg.line((50, 750), (900, 750), stroke='black', stroke_width=3))
